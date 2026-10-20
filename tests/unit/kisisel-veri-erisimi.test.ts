import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * T-116 — HASSAS VERİ ERİŞİM DENETİMİ (F5: sağlık, spor, hayat).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KAPI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `denetim-kaydi.test.ts` aynı soruyu YALNIZCA `audit-log` için soruyor:
 * "bir `'use server'` dosyası bu okumayı ağa açıyor mu". F5 yedi model getirdi
 * ve ikisi sistemdeki en hassas veri — vücut ölçümleri (KVKK özel nitelikli)
 * ve günlük (en kişisel serbest metin). Onlar için kimse sormuyordu.
 *
 * Üç ayrı sızıntı yolu var ve üçü de SESSİZ:
 *
 *   1. YETKİSİZ EYLEM — `'use server'` dosyasındaki her ihraç bir POST ucu.
 *      `currentActorId()` kontrolünü unutan TEK bir eylem, kimlik doğrulamasız
 *      yazma (ya da dönüş değeriyle okuma) demek. Birim testleri eylemleri
 *      tek tek sınıyor ama YENİ bir eylemi kimse sınamıyor.
 *   2. OKUMANIN AĞA AÇILMASI — `export { fetchJournalEntries } from …` gibi
 *      tek bir satır günlüğün tamamını POST ucuna çevirir.
 *   3. PANEL DIŞI İÇE AKTARMA — public sayfa, API ucu ya da ÖNBELLEK katmanı
 *      (`cached.ts`) bu servisleri okursa veri ya ziyaretçiye ya da
 *      kullanıcılar arası paylaşılan bir önbellek girdisine düşer.
 *
 * Kapı KAYNAKTAN tarıyor ve çekirdeği saf — mutasyon sentetik girdiyle
 * sınanıyor (ADR-038), yani "boş kümede yeşil" kalamıyor.
 */

const KOK = resolve(__dirname, '..', '..');

const kod = (yol: string): string =>
  readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

function kaynakDosyalari(): string[] {
  const toplanan: string[] = [];
  const gez = (goreli: string): void => {
    for (const ad of readdirSync(join(KOK, goreli))) {
      const yol = `${goreli}/${ad}`;
      if (statSync(join(KOK, yol)).isDirectory()) {
        if (ad === 'generated' || ad === 'node_modules') continue;
        gez(yol);
        continue;
      }
      if (/\.tsx?$/.test(ad)) toplanan.push(yol);
    }
  };
  gez('src');
  return toplanan;
}

/** F5 modüllerinin servis/eylem dosya adları (uzantısız). */
export const KISISEL_MODULLER = [
  'health-log',
  'exercise',
  'workout',
  'workout-set',
  'personal-record',
  'habit',
  'habit-log',
  'goal',
  'journal-entry',
] as const;

/** Bu modüllerin İÇE AKTARILABİLDİĞİ yerler — başka her yer ihlal. */
const IZINLI_ONEKLER = [
  'src/app/(panel)/',
  'src/components/panel/',
  'src/server/actions/',
  'src/server/services/',
] as const;

/**
 * Sunucu katmanında bile YASAK dosyalar — önbellek ve public okuma yolu.
 * `src/server/services/` izinli önekin İSTİSNASI: orada olmak yetmiyor.
 */
const YASAK_SUNUCU_DOSYALARI = [
  'src/server/services/cached.ts',
  'src/server/services/_shared/content-cache.ts',
  'src/server/services/_shared/content-query.ts',
  'src/server/services/stats.ts',
] as const;

/* ===========================================================================
 * SAF ÇEKİRDEK
 * ======================================================================== */

const modulDeseni = (modul: string): RegExp =>
  new RegExp(`from\\s+['"][^'"]*/(?:services|actions)/${modul}['"]`);

/** (3) Panel dışı içe aktaranlar. */
export function panelDisiIceAktaranlar(kaynaklar: ReadonlyMap<string, string>): string[] {
  const sonuc: string[] = [];
  for (const [yol, metin] of kaynaklar) {
    const izinli =
      IZINLI_ONEKLER.some((onek) => yol.startsWith(onek)) &&
      !(YASAK_SUNUCU_DOSYALARI as readonly string[]).includes(yol);
    if (izinli) continue;
    for (const modul of KISISEL_MODULLER) {
      if (modulDeseni(modul).test(metin)) sonuc.push(`${yol} → ${modul}`);
    }
  }
  return sonuc;
}

/**
 * (1) `'use server'` dosyasında kimlik kontrolüyle BAŞLAMAYAN ihraçlar.
 *
 * Ölçüt: gövdenin İLK ifadesi `currentActorId()` çağrısı ve hemen ardından
 * `if (!actorId) return unauthorized();`. "Gövdede bir yerde geçiyor" yetmez —
 * kontrolden ÖNCE bir okuma yapılırsa (ör. kayıt aranıp dönülürse) yetki
 * kapısı anlamsızlaşır.
 */
export function yetkisizEylemler(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const sonuc: string[] = [];
  const baslar = [...metin.matchAll(/export\s+async\s+function\s+(\w+)/g)];

  baslar.forEach((m, sira) => {
    const ad = m[1] ?? '?';
    const bolum = metin.slice(m.index ?? 0, baslar[sira + 1]?.index ?? metin.length);
    /*
     * GÖVDE, SATIR SONUYLA BİTEN İLK `{`ten başlıyor. İlk sürüm "ilk `{`"
     * diyordu ve dönüş tipindeki nesne tipini (`Promise<{ id: string; … }>`)
     * gövde sandı — iki doğru eylemi ihlal saydı. Tip içi süslü parantezi
     * boşluk izler, gövdeninkini satır sonu.
     */
    const govde = bolum.match(/\{[ \t]*\n([\s\S]*)/)?.[1] ?? '';
    const [ilk = '', ikinci = ''] = govde.split(';');
    const tamam =
      /^\s*const\s+actorId\s*=\s*await\s+currentActorId\(\)\s*$/.test(ilk) &&
      /^\s*if\s*\(\s*!actorId\s*\)\s*return\s+unauthorized\(\)\s*$/.test(ikinci);
    if (!tamam) sonuc.push(`${dosya} → ${ad}`);
  });

  return sonuc;
}

/** (2) `'use server'` dosyasından F5 OKUMASI yeniden ihracı. */
export function okumaIhraclari(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const sonuc: string[] = [];
  if (/export\s*\*\s*from/.test(metin)) sonuc.push(`${dosya} → export *`);
  for (const m of metin.matchAll(/export\s*\{([^}]*)\}/g)) {
    if (/\bfetch[A-Z]/.test(m[1] ?? '')) sonuc.push(`${dosya} → ${m[1]?.trim()}`);
  }
  return sonuc;
}

/* ===========================================================================
 * GERÇEK DEPO
 * ======================================================================== */

describe('T-116 — F5 hassas veri erişimi', () => {
  const dosyalar = kaynakDosyalari();
  const kaynaklar = new Map(dosyalar.map((yol) => [yol, kod(yol)]));
  const eylemDosyalari = KISISEL_MODULLER.map((m) => `src/server/actions/${m}.ts`).filter((y) =>
    kaynaklar.has(y),
  );

  it('önkoşul — tarama vakumda değil', () => {
    expect(dosyalar.length).toBeGreaterThan(100);
    // Eylem dosyası olan yedi modül: health-log, exercise, workout,
    // workout-set, habit (habit-log'u da taşıyor), goal, journal-entry.
    expect(eylemDosyalari.length, 'F5 eylem dosyaları bulunamadı').toBe(7);
    // Gerçek içe aktaranlar taranıyor mu — panel sayfası F5 servisini okuyor.
    expect(kod('src/app/(panel)/panel/saglik/page.tsx')).toMatch(modulDeseni('health-log'));
  });

  it('⚠️ (1) her F5 eylemi kimlik kontrolüyle BAŞLIYOR', () => {
    const ihlal = eylemDosyalari.flatMap((y) => yetkisizEylemler(y, kaynaklar.get(y) ?? ''));
    expect(ihlal, 'Kimlik kontrolüyle başlamayan Server Action').toEqual([]);

    // Çapa: gerçekten sayılan ihraç var (desen bozulursa yukarısı boşa yeşil kalırdı).
    const toplam = eylemDosyalari.reduce(
      (n, y) => n + ((kaynaklar.get(y) ?? '').match(/export\s+async\s+function/g) ?? []).length,
      0,
    );
    expect(toplam).toBeGreaterThanOrEqual(20);
  });

  it('⚠️ (2) hiçbir `use server` dosyası okuma ihraç etmiyor', () => {
    const ihlal = dosyalar
      .filter((y) => y.startsWith('src/server/actions/'))
      .flatMap((y) => okumaIhraclari(y, kaynaklar.get(y) ?? ''));
    expect(ihlal, 'Okumayı POST ucuna çeviren ihraç').toEqual([]);
  });

  it('⚠️ (3) F5 servis/eylemleri panel ve sunucu katmanı DIŞINDA içe aktarılmıyor', () => {
    expect(panelDisiIceAktaranlar(kaynaklar), 'Panel dışı içe aktarma').toEqual([]);
  });
});

/* ===========================================================================
 * MUTASYON — çekirdek gerçekten ısırıyor (ADR-038)
 * ======================================================================== */

describe('MUTASYON · kapı ısırıyor', () => {
  const GECERLI = `'use server';
export async function a(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(raw);
}`;

  it('kontrolü olan eylem geçiyor', () => {
    expect(yetkisizEylemler('x.ts', GECERLI)).toEqual([]);
  });

  it('kontrolü UNUTAN eylem yakalanıyor', () => {
    const bozuk = `${GECERLI}
export async function b(raw: unknown) {
  const kayit = await fetchJournalEntryById(raw);
  return ok(kayit);
}`;
    expect(yetkisizEylemler('x.ts', bozuk)).toEqual(['x.ts → b']);
  });

  it('dönüş tipindeki NESNE TİPİ gövde sanılmıyor (ilk sürümün yanlış alarmı)', () => {
    const tipli = `'use server';
export async function d(
  raw: unknown,
): Promise<ApiResponse<{ id: string; recordsRemoved: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(raw);
}`;
    expect(yetkisizEylemler('x.ts', tipli)).toEqual([]);
  });

  it('kontrolden ÖNCE okuma yapan eylem yakalanıyor', () => {
    const bozuk = `'use server';
export async function c(raw: unknown) {
  const kayit = await fetchHealthLogById(raw);
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(kayit);
}`;
    expect(yetkisizEylemler('x.ts', bozuk)).toEqual(['x.ts → c']);
  });

  it('okuma ihracı yakalanıyor — adlı ve yıldızlı', () => {
    expect(
      okumaIhraclari(
        'x.ts',
        `'use server';\nexport { fetchJournalEntries } from '../services/journal-entry';`,
      ),
    ).toHaveLength(1);
    expect(
      okumaIhraclari('x.ts', `'use server';\nexport * from '../services/habit';`),
    ).toHaveLength(1);
    // `use server` OLMAYAN modülde ihraç serbest (servis index'i böyle).
    expect(okumaIhraclari('x.ts', `export * from './habit';`)).toEqual([]);
  });

  it('public sayfa ve ÖNBELLEK katmanı yakalanıyor, panel serbest', () => {
    const kaynaklar = new Map([
      [
        'src/app/(public)/blog/page.tsx',
        `import { fetchHealthTrend } from '@/server/services/health-log';`,
      ],
      [
        'src/server/services/cached.ts',
        `import { fetchGoals } from './goal';`.replace("'./goal'", "'@/server/services/goal'"),
      ],
      [
        'src/app/(panel)/panel/saglik/page.tsx',
        `import { fetchHealthLogs } from '@/server/services/health-log';`,
      ],
      [
        'src/app/api/v1/x/route.ts',
        `import { toggleHabitDayAction } from '@/server/actions/habit';`,
      ],
    ]);
    expect(panelDisiIceAktaranlar(kaynaklar).sort()).toEqual([
      'src/app/(public)/blog/page.tsx → health-log',
      'src/app/api/v1/x/route.ts → habit',
      'src/server/services/cached.ts → goal',
    ]);
  });
});
