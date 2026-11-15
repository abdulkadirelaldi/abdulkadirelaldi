/**
 * MASA DOSYA SINIRLARI (ADR-049 M2b) — tarayıcıya da güvenli (Buffer yok): yükleyici parça
 * boyutunu ve kabul listesini buradan okur, sunucu aynı sayılarla doğrular.
 */

/** En büyük dosya: 300 MB (≈ 5 saatlik m4a ders kaydı). */
export const MASA_EN_BUYUK_BAYT = 300 * 1024 * 1024;
/**
 * Parça boyutu: 8 MiB. R2 son parça dışındaki parçaların EŞİT olmasını ister; nginx gövdeyi
 * 12 MB'ta keser. Sunucu son parça dışında bu boyuttan farklı parçayı reddeder.
 */
export const MASA_PARCA_BAYT = 8 * 1024 * 1024;
export const MASA_EN_COK_PARCA = Math.ceil(MASA_EN_BUYUK_BAYT / MASA_PARCA_BAYT);

/** Dosya seçicinin `accept`i — yalnızca kolaylık; karar baytlarda. */
export const MASA_KABUL =
  '.pdf,.jpg,.jpeg,.png,.webp,.avif,.docx,.xlsx,.pptx,.m4a,.mp3,.wav,.webm,.ogg,.opus,audio/*,application/pdf,image/*';

export const OFFICE_MIME: Readonly<Record<string, string>> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Sunumda indirilecek mi — satırdaki MIME'dan (Office belgeleri). */
export function indirilirMi(mime: string): boolean {
  return Object.values(OFFICE_MIME).includes(mime);
}

/** "12,4 MB" · "850 KB". */
export function boyutMetni(bayt: number): string {
  if (bayt >= 1024 * 1024) {
    return `${(bayt / (1024 * 1024)).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bayt / 1024)).toLocaleString('tr-TR')} KB`;
}
