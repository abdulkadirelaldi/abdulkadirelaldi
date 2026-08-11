import * as z from 'zod';

/**
 * Paylaşılan Zod primitifleri — PROGRAM.md §7.3, §8.8.
 *
 * Bu dosya Backend mülkiyetindedir; Frontend yalnızca tüketir. Amaç, aynı
 * doğrulama kuralının iki yerde ayrı yazılmasını YAPISAL olarak engellemektir.
 *
 * ZOD 4 (risk R7): `z.string().email()` yerine `z.email()`, `errorMap` yerine
 * `error`. Sürümün gerçek API'si doğrulanarak yazılmıştır.
 *
 * MESAJ DİLİ: Tüm hata mesajları Türkçe ve doğrudan kullanıcıya gösterilebilir
 * (§7.2 "kullanıcıya düzeltici mesaj döner").
 */

/* ===========================================================================
 * KİMLİK & YEREL
 * ======================================================================== */

/** Prisma `cuid()` — 25 karakter, `c` ile başlar. Gevşek tutuldu: uzunluk kontrolü yeterli. */
export const cuidSchema = z
  .string()
  .min(1, { error: 'Kimlik boş olamaz.' })
  .max(64, { error: 'Kimlik çok uzun.' });

/**
 * ADR-019 — içerik modelleri `locale` taşır. v1'de yalnızca `tr` üretilir,
 * ama altyapı hazır bırakılır (§1.2).
 */
export const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, { error: 'Dil kodu geçersiz (örn. tr, en-US).' })
  .default('tr');

/* ===========================================================================
 * SLUG
 * ======================================================================== */

/**
 * Türkçe harf → ASCII dönüşüm tablosu.
 *
 * `String.normalize('NFD')` ile aksan ayıklama BURADA YETMEZ: `ı` (noktasız i)
 * bir aksan bileşimi değil, bağımsız bir kod noktasıdır ve NFD onu ayrıştırmaz.
 * `ğ` ve `ş` de öyle. Bu yüzden tablo açıkça yazılır.
 */
const TURKISH_TO_ASCII: Readonly<Record<string, string>> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/**
 * Başlıktan slug üretir. Frontend bunu "başlıktan otomatik slug" için kullanır;
 * Backend de aynı fonksiyonu kullanır — iki yerde ayrı kural yazılmaz.
 *
 * Kural: Türkçe harfler ASCII karşılığına çevrilir (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c),
 * geri kalan her şey küçük harfe indirilir, harf-rakam dışı karakterler tek tireye
 * dönüşür, baştaki/sondaki tireler atılır.
 */
export function slugify(input: string): string {
  const transliterated = [...input]
    .map((char) => TURKISH_TO_ASCII[char] ?? char)
    .join('')
    .toLowerCase()
    // Türkçe olmayan aksanlar (é, à, ñ …) için NFD yeterli
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/**
 * Slug doğrulaması: yalnızca küçük harf, rakam ve tek tire.
 * Türkçe karakter İÇEREMEZ — `slugify()` ile üretilmiş olmalıdır.
 */
export const slugSchema = z
  .string()
  .min(1, { error: 'Slug boş olamaz.' })
  .max(96, { error: 'Slug en fazla 96 karakter olabilir.' })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error:
      'Slug yalnızca küçük harf, rakam ve tire içerebilir; Türkçe karakter kullanılamaz (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c).',
  });

/* ===========================================================================
 * PARA — ADR-014
 *
 * Para alanları GİRDİ olarak `string` alır ve `string` olarak kalır.
 * Neden `number` değil: IEEE-754 çift duyarlık 0.1 + 0.2 = 0.30000000000000004
 * üretir; muhasebede bu kabul edilemez. Prisma `Decimal` alanlara string
 * atanabildiği için dönüşüm kaybı da olmaz.
 * ======================================================================== */

/** `Decimal(12,2)` — en fazla 10 tam basamak + 2 ondalık. */
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

/** `Decimal(18,8)` — en fazla 10 tam basamak + 8 ondalık. */
const FX_RATE_PATTERN = /^\d{1,10}(?:\.\d{1,8})?$/;

/**
 * Tutar. Negatif kabul edilmez — yön `TransactionType` (INCOME/EXPENSE) ile
 * belirlenir, eksi işaretiyle değil. İki yerde yön taşımak toplamları bozar.
 */
export const moneySchema = z
  .string()
  .trim()
  .min(1, { error: 'Tutar zorunludur.' })
  .regex(MONEY_PATTERN, {
    error: 'Tutar geçersiz. En fazla 2 ondalık basamak kullanın (örn. 1250.00).',
  });

/** İşlem anındaki kur, TRY bazlı (ADR-014). Sıfır olamaz. */
export const fxRateSchema = z
  .string()
  .trim()
  .min(1, { error: 'Kur zorunludur.' })
  .regex(FX_RATE_PATTERN, {
    error: 'Kur geçersiz. En fazla 8 ondalık basamak kullanın (örn. 34.12345678).',
  })
  .refine((value) => Number(value) > 0, { error: 'Kur sıfırdan büyük olmalıdır.' });

/** Ondalık ölçüm alanları (kilo, uyku saati vb.) — para değil ama aynı hassasiyet kaygısı. */
export function decimalSchema(maxIntegerDigits: number, maxFractionDigits: number) {
  const pattern = new RegExp(`^\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxFractionDigits}})?$`);
  return z
    .string()
    .trim()
    .regex(pattern, {
      error: `Değer geçersiz. En fazla ${maxFractionDigits} ondalık basamak kullanın.`,
    });
}

/* ===========================================================================
 * TARİH — ADR-016
 * ======================================================================== */

/**
 * Gün semantiği taşıyan alanlar (`@db.Date`).
 *
 * `z.iso.date()` SAAT BİLEŞENİ KABUL ETMEZ — `2026-08-05T10:00:00Z` reddedilir.
 * Bu bilinçlidir: saat kabul edilirse Europe/Istanbul (UTC+3) altında 00:00–03:00
 * arasındaki girişler bir önceki güne kayar ve ay sınırındaki toplamlar sessizce
 * bozulur. Doğrulama katmanı bu hata sınıfını en baştan kapatır.
 *
 * String olarak kalır; `Date`'e çevirme T-015'teki zaman dilimi yardımcısının işidir.
 */
export const dayDateSchema = z.iso.date({
  error: 'Tarih YYYY-AA-GG biçiminde olmalıdır (saat bilgisi içeremez).',
});

/** Gerçek bir anı bildiren alanlar (`createdAt`, `paidAt`, `publishedAt` …). */
export const instantSchema = z.iso.datetime({
  error: 'Tarih/saat ISO 8601 biçiminde olmalıdır.',
});

/* ===========================================================================
 * periodKey — ADR-015
 * ======================================================================== */

/**
 * Tekrarlayan işlem üretim dönemi. `@@unique([sourceRecurringId, periodKey])`
 * ile birlikte cron'un çift üretimini veritabanı düzeyinde engeller.
 *
 * Kabul edilen dört biçim:
 *   aylık   YYYY-MM        2026-08
 *   yıllık  YYYY           2026
 *   haftalık YYYY-Www      2026-W32   (ISO hafta, 01–53)
 *   günlük  YYYY-MM-DD     2026-08-05
 */
const PERIOD_KEY_PATTERN =
  /^(?:\d{4}|\d{4}-(?:0[1-9]|1[0-2])|\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])|\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))$/;

export const periodKeySchema = z.string().regex(PERIOD_KEY_PATTERN, {
  error: 'Dönem anahtarı geçersiz. Beklenen biçimler: 2026, 2026-08, 2026-W32, 2026-08-05.',
});

/* ===========================================================================
 * ÖLÇEKLER — ADR-020 (enum değil, sayısal ölçek)
 * ======================================================================== */

/** 1–5 ruh hâli / his ölçeği (`HealthLog.mood`, `Workout.feeling`, `JournalEntry.mood`). */
export const moodSchema = z
  .number()
  .int({ error: 'Değer tam sayı olmalıdır.' })
  .min(1, { error: 'Değer 1 ile 5 arasında olmalıdır.' })
  .max(5, { error: 'Değer 1 ile 5 arasında olmalıdır.' });

/** 1–10 algılanan zorluk (`WorkoutSet.rpe`). */
export const rpeSchema = z
  .number()
  .int({ error: 'RPE tam sayı olmalıdır.' })
  .min(1, { error: 'RPE 1 ile 10 arasında olmalıdır.' })
  .max(10, { error: 'RPE 1 ile 10 arasında olmalıdır.' });

/** 0–100 yüzde (`Skill.level`, `Goal.progress`). */
export const percentSchema = z
  .number()
  .int({ error: 'Değer tam sayı olmalıdır.' })
  .min(0, { error: 'Değer 0 ile 100 arasında olmalıdır.' })
  .max(100, { error: 'Değer 0 ile 100 arasında olmalıdır.' });

/* ===========================================================================
 * ORTAK YARDIMCILAR
 * ======================================================================== */

export const optionalUrlSchema = z
  .url({ error: 'Geçerli bir bağlantı adresi girin (https:// ile başlamalı).' })
  .max(2048, { error: 'Bağlantı adresi çok uzun.' });

/**
 * E-posta.
 *
 * SIRA ÖNEMLİ: `trim()` doğrulamadan ÖNCE gelir. `z.email()` ile başlanıp
 * sonra `.transform(trim)` yazılsaydı, kopyala-yapıştırla gelen baştaki/sondaki
 * boşluk doğrulamada reddedilirdi — dönüşüm sıra olarak çok geç çalışıyor.
 * Ölçüldü: `'  a@b.com '` bu sırayla geçiyor, ters sırayla `invalid_format` veriyordu.
 *
 * Küçük harfe indirme de burada yapılır: `Client.email` benzersizdir (ADR-017),
 * `A@b.com` ile `a@b.com` iki ayrı müşteri açmamalıdır.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Geçerli bir e-posta adresi girin.' }))
  .pipe(z.string().max(254, { error: 'E-posta adresi çok uzun.' }));

/** Serbest metin alanları için ortak sınır — sınırsız metin DoS yüzeyidir (§8). */
export const shortTextSchema = z.string().trim().max(255, { error: 'En fazla 255 karakter.' });
export const mediumTextSchema = z.string().trim().max(2000, { error: 'En fazla 2000 karakter.' });
export const longTextSchema = z.string().trim().max(100_000, { error: 'Metin çok uzun.' });

/** Etiket listesi — ADR-019 gereği v1'de scalar. */
export const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, { error: 'Etiket boş olamaz.' })
      .max(32, { error: 'Etiket en fazla 32 karakter olabilir.' }),
  )
  .max(20, { error: 'En fazla 20 etiket ekleyebilirsiniz.' })
  .default([]);

export const orderSchema = z
  .number()
  .int({ error: 'Sıra tam sayı olmalıdır.' })
  .min(0, { error: 'Sıra negatif olamaz.' })
  .default(0);

/* ===========================================================================
 * GÜNCELLEME ŞEMASI YARDIMCISI
 * ======================================================================== */

/**
 * Kısmi güncelleme şeması üretir: tüm alanlar opsiyonel VE varsayılanlar kaldırılmış.
 *
 * NEDEN GEREKLİ — bu bir tuzak:
 * Zod'da `.partial()` alanı yalnızca GİRDİDE opsiyonel yapar; `.default()` ÇIKTIDA
 * çalışmaya devam eder. Yani `base.partial()` ile üretilen bir güncelleme şeması,
 * gönderilmeyen alanlara varsayılan değerleri ENJEKTE eder.
 *
 * Ölçülen somut sonuç (düzeltmeden önce):
 *   updateProjectSchema.parse({ id, title: 'Yeni' })
 *     → { id, title, status: 'DRAFT', featured: false, order: 0, tags: [], stack: [], locale: 'tr' }
 *
 * Bu nesne Prisma `update`'ine verilseydi, YALNIZCA BAŞLIK düzenlemek yayındaki
 * projeyi taslağa düşürür, etiketlerini siler, öne çıkarmasını ve sırasını
 * sıfırlardı. Sessiz veri kaybı — en kötü hata sınıfı.
 *
 * Bu yüzden her `updateXSchema` bu yardımcıdan geçer: `ZodDefault` sarmalayıcısı
 * açılır, yalnızca gerçekten gönderilen alanlar çıktıya girer.
 */
export function partialWithoutDefaults<T extends z.ZodObject>(schema: T) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.def.innerType : field,
    ]),
  ) as T['shape'];

  return z.object(shape).partial();
}

/* ===========================================================================
 * FİLTRE TABANI
 *
 * Filtreler URL arama parametrelerinden gelir; değerler DAİMA string'tir.
 * Bu yüzden sayısal alanlarda `z.coerce` kullanılır.
 * ======================================================================== */

export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, { error: 'Sayfa numarası 1 veya daha büyük olmalıdır.' })
    .default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1, { error: 'Sayfa boyutu en az 1 olmalıdır.' })
    .max(100, { error: 'Sayfa boyutu en fazla 100 olabilir.' })
    .default(20),
});

/** Serbest metin arama — her filtre şemasında ortak. */
export const searchSchema = z.string().trim().max(120, { error: 'Arama terimi çok uzun.' });

/** Gün aralığı filtresi. Bitiş, başlangıçtan önce olamaz. */
export const dateRangeSchema = z
  .object({
    from: dayDateSchema.optional(),
    to: dayDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
    path: ['to'],
  });

export type Pagination = z.infer<typeof paginationSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
