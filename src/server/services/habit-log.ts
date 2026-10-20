import type { CreateHabitLogInput, ToggleHabitLogInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { appDayToDate, type AppDay } from './_shared';

/**
 * `HabitLog` servisi — §4.2 "alışkanlık" panosunun YAZMA yolu, ADR-021, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `count = 0` SATIR TUTULMAZ — "yapıldı" = SATIR VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-021 "yapıldı = `count > 0`" diyor. Sıfır sayaçlı bir satır saklamak bu
 * tanımın yanına ikinci bir "yapılmadı" gösterimi koymak olurdu: satırın
 * YOKLUĞU ve `count = 0` satırı aynı şeyi söylerdi ve her okuyucu ikisini de
 * hesaba katmak zorunda kalırdı. Sayaç sıfıra inince satır SİLİNİR; tek
 * gösterim kalır.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YARIŞ: `upsert`, ön kontrol değil
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Panoda bir hücreye hızlı iki tık iki eşzamanlı istek demek. "Var mı bak,
 * yoksa ekle" ikisinde de "yok" görür ve ikinci `create` P2002 ile düşer —
 * kullanıcı tıkladığı hâlde hata görür. `@@unique([habitId, date])` üzerinde
 * `upsert` bunu tek ifadede çözüyor.
 *
 * ⚠️ ARŞİVLENMİŞ ALIŞKANLIĞA İŞARET KONMAZ: arşiv "bıraktım" demek (habit.ts).
 * Pano onu zaten göstermiyor; bu kontrol eski bir sekmeden ya da elle
 * gönderilen istekten gelen yazmayı durduruyor.
 */

/** Şemanın `count` üst sınırı — artırma bu sınırda DURUR, taşmaz. */
export const HABIT_LOG_MAX_COUNT = 100;

export interface HabitDayResult {
  habitId: string;
  date: AppDay;
  /** Yazmadan sonraki sayaç. `0` → satır yok (silindi ya da hiç yoktu). */
  count: number;
}

/** Hedef alışkanlık neden yazılamadı — eylem bunu kullanıcı metnine çevirir. */
export type HabitWriteBlock = 'NOT_FOUND' | 'ARCHIVED';

export class HabitWriteBlockedError extends Error {
  constructor(readonly reason: HabitWriteBlock) {
    super(`habit write blocked: ${reason}`);
    this.name = 'HabitWriteBlockedError';
  }
}

export interface HabitLogClient {
  habit: {
    findUnique(args: {
      where: { id: string };
      select: { targetPerDay: true; isArchived: true };
    }): Promise<{ targetPerDay: number | null; isArchived: boolean } | null>;
  };
  habitLog: {
    findUnique(args: {
      where: { habitId_date: { habitId: string; date: Date } };
      select: { count: true };
    }): Promise<{ count: number } | null>;
    upsert(args: {
      where: { habitId_date: { habitId: string; date: Date } };
      create: { habitId: string; date: Date; count: number };
      update: { count: number };
      select: { count: true };
    }): Promise<{ count: number }>;
    deleteMany(args: { where: { habitId: string; date: Date } }): Promise<{ count: number }>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: HabitLogClient = db;
void _uyumKontrolu;

async function requireWritableHabit(
  habitId: string,
  client: HabitLogClient,
): Promise<{ targetPerDay: number | null }> {
  const habit = await client.habit.findUnique({
    where: { id: habitId },
    select: { targetPerDay: true, isArchived: true },
  });

  if (!habit) throw new HabitWriteBlockedError('NOT_FOUND');
  if (habit.isArchived) throw new HabitWriteBlockedError('ARCHIVED');
  return habit;
}

/** Sayacı yazar; `0` satırı siler (dosya başındaki kural). */
async function writeCount(
  habitId: string,
  day: AppDay,
  count: number,
  client: HabitLogClient,
): Promise<HabitDayResult> {
  const date = appDayToDate(day);

  if (count <= 0) {
    // `deleteMany`: satır zaten yoksa hata değil — "sıfırla" idempotent.
    await client.habitLog.deleteMany({ where: { habitId, date } });
    return { habitId, date: day, count: 0 };
  }

  const row = await client.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    create: { habitId, date, count },
    update: { count },
    select: { count: true },
  });

  return { habitId, date: day, count: row.count };
}

/**
 * Panodaki hücreye tıklamak — §4.2'nin en sık eylemi.
 *
 * Davranış alışkanlığın türüne bağlı:
 *   - `targetPerDay` YOK (yapıldı/yapılmadı) → AÇ/KAPA. Yanlışlıkla işaretlenen
 *     gün ikinci tıkla geri alınabilmeli.
 *   - `targetPerDay` VAR (8 bardak su) → sayacı BİR ARTIR. Burada aç/kapa
 *     yanlış olurdu: ikinci bardak ilk bardağı silerdi. Düzeltme için
 *     `setHabitDayCount` var.
 *
 * ⚠️ OKU-SONRA-YAZ yarışı ARTIRMADA kabul edildi: iki eşzamanlı tık aynı
 * sayacı okuyup ikisi de `n+1` yazabilir, yani bir tık kaybolur. Prisma'nın
 * `increment`i bunu çözerdi ama `upsert`in `create` dalında anlamsız ve üst
 * sınırı (`HABIT_LOG_MAX_COUNT`) uygulayamaz. Tek kullanıcılı bir panoda
 * kayıp tık görünür (sayı ekranda) ve düzeltilebilir; P2002 hatası değil.
 */
export async function toggleHabitDay(
  input: ToggleHabitLogInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  const habit = await requireWritableHabit(input.habitId, client);

  const existing = await client.habitLog.findUnique({
    where: { habitId_date: { habitId: input.habitId, date: appDayToDate(input.date) } },
    select: { count: true },
  });
  const current = existing?.count ?? 0;

  const next =
    habit.targetPerDay === null
      ? current > 0
        ? 0
        : 1
      : Math.min(current + 1, HABIT_LOG_MAX_COUNT);

  return writeCount(input.habitId, input.date, next, client);
}

/** Sayacı doğrudan belirler — düzeltme yolu. `0` → işareti kaldırır. */
export async function setHabitDayCount(
  input: CreateHabitLogInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  await requireWritableHabit(input.habitId, client);
  return writeCount(input.habitId, input.date, input.count, client);
}
