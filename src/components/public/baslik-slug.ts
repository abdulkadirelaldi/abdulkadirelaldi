import { Children, isValidElement, type ReactNode } from 'react';

/**
 * MDX başlıklarından bağlantı kimliği (`id`) üretimi — /blog içindekiler tablosu.
 *
 * TEK KAYNAK OLMASI ŞART: aynı kural HEM `mdx.tsx`'in başlık bileşenlerinde
 * (öğeye `id` basarken) HEM `icindekiler.tsx`'te (kaynağı ayrıştırıp bağlantı
 * üretirken) kullanılıyor. İki yerde ayrı yazılsaydı bir gün ayrışır ve
 * içindekiler bağlantıları sessizce hiçbir yere gitmezdi — kırılan bir şey
 * görünmez, sadece tıklayınca bir şey olmaz.
 *
 * NEDEN `rehype-slug` DEĞİL: yeni bağımlılık gerektiriyor (bu görevde bağımlılık
 * eklenmiyor) ve `id`'leri sanitize'in `clobberPrefix: 'user-content-'` kuralına
 * teslim ederdi — üretilen `id` ile içindekilerin beklediği `id` farklı olurdu.
 * Bileşen katmanında üretmek sanitize'e hiç dokunmuyor.
 */

/** Türkçe harfler ASCII karşılığına çevrilir — `toLocaleLowerCase('tr')` kullanılmıyor. */
const HARF_ESLEME: Record<string, string> = {
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ş: 's',
  Ş: 's',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

/**
 * `"Önbellekleme Notları"` → `"onbellekleme-notlari"`.
 *
 * `İ` TUZAĞI: `'İ'.toLocaleLowerCase('tr')` birleştirici noktalı bir karakter
 * üretir ve `id` içinde görünmez bir bayt bırakır. Bu yüzden harf eşlemesi
 * küçültmeden ÖNCE uygulanıyor.
 */
export function basligaSlug(metin: string): string {
  const asciilesmis = [...metin].map((h) => HARF_ESLEME[h] ?? h).join('');

  return (
    asciilesmis
      .toLowerCase()
      .normalize('NFKD')
      // Aksan işaretleri (ör. "é" → "e")
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'baslik'
  );
}

/**
 * React çocuklarından düz metin çıkarır — başlık `id`'si metinden üretiliyor.
 * `**kalın**` gibi iç öğeler yüzünden çocuk her zaman düz dize olmuyor.
 */
export function metinCikar(children: ReactNode): string {
  return Children.toArray(children)
    .map((cocuk) => {
      if (typeof cocuk === 'string' || typeof cocuk === 'number') return String(cocuk);
      if (isValidElement<{ children?: ReactNode }>(cocuk)) return metinCikar(cocuk.props.children);
      return '';
    })
    .join('');
}
