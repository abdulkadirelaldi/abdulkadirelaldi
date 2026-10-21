/**
 * ADR-046 — sitenin dilleri. Tek kaynak: adres çözümleme, sözlük, `<html lang>`,
 * hreflang ve tarih biçimi buradan okur.
 *
 * Türkçe VARSAYILAN ve öneksiz (`/projeler`): mevcut adresler ve arama
 * motorundaki dizin bozulmasın. Diğer diller önekli (`/en/…`, `/de/…`).
 */

export const DILLER = ['tr', 'en', 'de'] as const;
export type Dil = (typeof DILLER)[number];

export const VARSAYILAN_DIL: Dil = 'tr';

/** Önekli diller — adresin ilk parçası. */
export const ONEKLI_DILLER = DILLER.filter((d) => d !== VARSAYILAN_DIL) as Exclude<Dil, 'tr'>[];

export function dilMi(deger: string | undefined | null): deger is Dil {
  return DILLER.includes(deger as Dil);
}

/** Dil seçicide görünen ad — her dil KENDİ adıyla (ziyaretçi kendi dilini arar). */
export const DIL_ADI: Record<Dil, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
};

/** `Intl` biçimleyicileri ve `og:locale` için bölge kodu. */
export const BOLGE: Record<Dil, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
};

/** `og:locale` biçimi (alt çizgili). */
export const OG_BOLGE: Record<Dil, string> = {
  tr: 'tr_TR',
  en: 'en_US',
  de: 'de_DE',
};

/** Middleware'in sunucu bileşenlerine dili ilettiği istek başlığı. */
export const DIL_BASLIGI = 'x-dil';
