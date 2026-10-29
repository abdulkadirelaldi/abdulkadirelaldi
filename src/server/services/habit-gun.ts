import type { MoveHabitInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { addAppDays, appDayToDate, appToday, dateToAppDay, type AppDay } from './_shared';

/**
 * HAYAT · GÜNLÜK LİSTE VE RAPOR (2026-10-29).
 *
 * Sahibi alışkanlıklarını her gün SIRAYLA işaretliyor: yaptım ya da yapmadım.
 * Bu dosya o akışın okumalarını taşıyor:
 *
 *   - `fetchHabitDay`    — tek günün listesi + özet ("bugün 2 şeyi yapmadın")
 *   - `fetchHabitReport` — son N günün alışkanlık bazında dökümü
 *
 * Dört durum, karıştırılmadan (rapor bunlara dayanıyor):
 *
 *   YAPILDI    → sayaç hedefe ulaştı (sayısızda 1)
 *   EKSIK      → sayılı alışkanlıkta 0 < sayaç < hedef ("8 bardaktan 5")
 *   YAPILMADI  → kullanıcı AÇIKÇA "yapmadım" dedi (`missed`)
 *   ISARETSIZ  → o gün hiçbir şey girilmedi
 *
 * ⚠️ Alışkanlık EKLENDİĞİ GÜNDEN ÖNCE sayılmaz: bugün eklenen bir alışkanlık
 * dünkü raporda "işaretlenmemiş" görünseydi oranı haksız yere düşerdi.
 */

export type GunDurumu = 'YAPILDI' | 'EKSIK' | 'YAPILMADI' | 'ISARETSIZ';

/** Sayaç + açık işaret → durum. SAF. */
export function gunDurumu(count: number, missed: boolean, targetPerDay: number | null): GunDurumu {
  if (missed) return 'YAPILMADI';
  if (count <= 0) return 'ISARETSIZ';
  return count >= (targetPerDay ?? 1) ? 'YAPILDI' : 'EKSIK';
}

export interface GunlukAliskanlikDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  targetPerDay: number | null;
  count: number;
  durum: GunDurumu;
}

export interface GunOzeti {
  toplam: number;
  yapildi: number;
  eksik: number;
  yapilmadi: number;
  isaretsiz: number;
}

export interface GunlukListeDto {
  gun: AppDay;
  bugun: AppDay;
  items: GunlukAliskanlikDto[];
  ozet: GunOzeti;
}

function ozetle(durumlar: readonly GunDurumu[]): GunOzeti {
  const say = (d: GunDurumu) => durumlar.filter((x) => x === d).length;
  return {
    toplam: durumlar.length,
    yapildi: say('YAPILDI'),
    eksik: say('EKSIK'),
    yapilmadi: say('YAPILMADI'),
    isaretsiz: say('ISARETSIZ'),
  };
}

const AKTIF = { isActive: true, isArchived: false } as const;
const SIRA = [{ order: 'asc' as const }, { name: 'asc' as const }, { id: 'asc' as const }];

type GunClient = Pick<typeof db, 'habit' | 'habitLog'>;

/** Tek günün listesi — sahibinin sırasıyla; o gün henüz yokken eklenenler hariç. */
export async function fetchHabitDay(
  gun: AppDay,
  client: GunClient = db,
  bugun: AppDay = appToday(),
): Promise<GunlukListeDto> {
  const gunSonu = appDayToDate(addAppDays(gun, 1));
  const habits = await client.habit.findMany({
    where: { ...AKTIF, createdAt: { lt: gunSonu } },
    select: { id: true, name: true, icon: true, color: true, targetPerDay: true },
    orderBy: SIRA,
  });
  const logs = await client.habitLog.findMany({
    where: { habitId: { in: habits.map((h) => h.id) }, date: appDayToDate(gun) },
    select: { habitId: true, count: true, missed: true },
  });
  const kayit = new Map(logs.map((l) => [l.habitId, l]));

  const items = habits.map((h) => {
    const l = kayit.get(h.id);
    const count = l?.count ?? 0;
    return { ...h, count, durum: gunDurumu(count, l?.missed ?? false, h.targetPerDay) };
  });

  return { gun, bugun, items, ozet: ozetle(items.map((i) => i.durum)) };
}

export interface AliskanlikRaporSatiri {
  id: string;
  name: string;
  icon: string | null;
  /** Alışkanlığın var olduğu gün sayısı (pencere içinde). */
  gunSayisi: number;
  yapildi: number;
  eksik: number;
  yapilmadi: number;
  isaretsiz: number;
  /** `yapildi / gunSayisi` — yüzde, tam sayı. */
  oran: number;
  /** Penceredeki her gün için durum (eski → yeni); alışkanlık yokken `null`. */
  gunler: (GunDurumu | null)[];
}

export interface AliskanlikRaporDto {
  from: AppDay;
  to: AppDay;
  gunler: AppDay[];
  satirlar: AliskanlikRaporSatiri[];
  /** Tüm alışkanlıkların toplamı — "son 7 günde %72". */
  genelOran: number;
}

/** Son `gunSayisi` gün (bugün dahil, `bitis`e kadar). */
export async function fetchHabitReport(
  bitis: AppDay,
  gunSayisi: number,
  client: GunClient = db,
): Promise<AliskanlikRaporDto> {
  const from = addAppDays(bitis, -(gunSayisi - 1));
  const gunler = Array.from({ length: gunSayisi }, (_, i) => addAppDays(from, i));

  const habits = await client.habit.findMany({
    where: AKTIF,
    select: { id: true, name: true, icon: true, targetPerDay: true, createdAt: true },
    orderBy: SIRA,
  });
  const logs = await client.habitLog.findMany({
    where: {
      habitId: { in: habits.map((h) => h.id) },
      date: { gte: appDayToDate(from), lte: appDayToDate(bitis) },
    },
    select: { habitId: true, date: true, count: true, missed: true },
  });
  const kayit = new Map(logs.map((l) => [`${l.habitId}|${dateToAppDay(l.date)}`, l]));

  let toplamGun = 0;
  let toplamYapildi = 0;
  const satirlar = habits.map((h) => {
    const baslangic = dateToAppDay(h.createdAt);
    const durumlar = gunler.map((g) => {
      if (g < baslangic) return null;
      const l = kayit.get(`${h.id}|${g}`);
      return gunDurumu(l?.count ?? 0, l?.missed ?? false, h.targetPerDay);
    });
    const var_ = durumlar.filter((d): d is GunDurumu => d !== null);
    const ozet = ozetle(var_);
    toplamGun += var_.length;
    toplamYapildi += ozet.yapildi;
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      gunSayisi: var_.length,
      yapildi: ozet.yapildi,
      eksik: ozet.eksik,
      yapilmadi: ozet.yapilmadi,
      isaretsiz: ozet.isaretsiz,
      oran: var_.length === 0 ? 0 : Math.round((ozet.yapildi / var_.length) * 100),
      gunler: durumlar,
    };
  });

  return {
    from,
    to: bitis,
    gunler,
    satirlar,
    genelOran: toplamGun === 0 ? 0 : Math.round((toplamYapildi / toplamGun) * 100),
  };
}

/**
 * Sahibinin kendi listesi (2026-10-29) — boş panelde tek dokunuşla eklenir.
 * Sayılı olanlar: su 3,5 L = 7 × 500 ml bardak. Liste SIRASIYLA eklenir.
 */
export const ONERILEN_ALISKANLIKLAR: ReadonlyArray<{
  name: string;
  icon: string;
  targetPerDay?: number;
}> = [
  { name: 'Diş fırçala', icon: '🪥', targetPerDay: 2 },
  { name: 'Yüze buz uygula', icon: '🧊' },
  { name: 'Spor / egzersiz', icon: '🏋️' },
  { name: 'Su iç (3,5 L)', icon: '💧', targetPerDay: 7 },
  { name: 'Kod yaz', icon: '💻' },
  { name: 'Kitap oku', icon: '📖' },
  { name: 'İngilizce çalış', icon: '🇬🇧' },
  { name: 'Ders çalış', icon: '🎓' },
];

/** Hiç (arşivsiz) alışkanlık yokken önerilen listeyi ekler; varsa dokunmaz. */
export async function createSuggestedHabits(client: GunClient = db): Promise<number> {
  const mevcut = await client.habit.count({ where: { isArchived: false } });
  if (mevcut > 0) return 0;
  await client.habit.createMany({
    data: ONERILEN_ALISKANLIKLAR.map((a, i) => ({
      name: a.name,
      icon: a.icon,
      targetPerDay: a.targetPerDay ?? null,
      order: (i + 1) * 10,
    })),
  });
  return ONERILEN_ALISKANLIKLAR.length;
}

/**
 * Listede bir basamak taşır: komşusuyla `order` değerini değiştirir. Sıralar
 * eşitse (eski kayıtlar 0) önce tüm liste 10'ar aralıkla numaralanır.
 */
export async function moveHabit(input: MoveHabitInput, client: GunClient = db): Promise<void> {
  const liste = await client.habit.findMany({
    where: { isArchived: false },
    select: { id: true, order: true },
    orderBy: SIRA,
  });
  const i = liste.findIndex((h) => h.id === input.id);
  const j = input.yon === 'yukari' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= liste.length) return;

  const yeni = liste.map((h) => h.id);
  [yeni[i], yeni[j]] = [yeni[j]!, yeni[i]!];
  await Promise.all(
    yeni.map((id, k) => client.habit.update({ where: { id }, data: { order: (k + 1) * 10 } })),
  );
}
