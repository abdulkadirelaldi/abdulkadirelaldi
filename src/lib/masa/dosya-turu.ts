import { sniffMime } from '@/server/services/_shared/file-type';

import { OFFICE_MIME } from './dosya-sinirlari';

/**
 * MASA DOSYA TÜRLERİ (ADR-049 M2b) — saf. Kural sitenin geneliyle aynı: TÜR BAYTLARDAN,
 * uzantıdan ya da `Content-Type`tan değil (§8.11). Masa daha geniş bir küme kabul eder (ders
 * kaydı, ödev belgesi) ama hepsi sabit imzalı.
 *
 * ⚠️ OFFICE BELGELERİ (docx/xlsx/pptx) ZIP'TİR: imza (`PK\x03\x04`) türü AYIRT ETMEZ. Yalnızca
 * uzantı da uyuyorsa kabul edilir ve tarayıcıda AÇILMAZ, İNDİRİLİR (`indirilir`) — içerik
 * yorumlanmaz. Tek kullanıcının kendi dosyası; risk, belgeyi PDF'e çevirmeye zorlamaktan küçük.
 */

export type MasaDosyaTuru = 'DOSYA' | 'SES';

export interface MasaDosyaBilgisi {
  mime: string;
  tur: MasaDosyaTuru;
  /** `Content-Disposition: attachment` — tarayıcıda açılmaz. */
  indirilir: boolean;
}

/** ISO taban ortam (`ftyp`) markaları — ses kabı olarak kabul edilenler. iPhone Sesli Not: `M4A `. */
const SES_MARKALARI = new Set(['M4A ', 'M4B ', 'mp42', 'isom', 'iso5', 'dash']);

function uzanti(ad: string): string {
  const i = ad.lastIndexOf('.');
  return i < 0 ? '' : ad.slice(i + 1).toLocaleLowerCase('en');
}

function sesTuru(b: Uint8Array): string | null {
  const ascii = (bas: number, son: number) => String.fromCharCode(...b.subarray(bas, son));
  if (b.length < 12) return null;
  // MP4/M4A kabı.
  if (ascii(4, 8) === 'ftyp' && SES_MARKALARI.has(ascii(8, 12))) return 'audio/mp4';
  // MP3: ID3 etiketi ya da MPEG çerçeve senkronu (11 bit 1).
  if (ascii(0, 3) === 'ID3') return 'audio/mpeg';
  if (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0 && (b[1]! & 0x06) !== 0) return 'audio/mpeg';
  // WAV: RIFF kabı + 'WAVE'.
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav';
  // WebM/Matroska (tarayıcının MediaRecorder çıktısı): EBML başlığı.
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'audio/webm';
  // Ogg (Opus/Vorbis).
  if (ascii(0, 4) === 'OggS') return 'audio/ogg';
  return null;
}

/**
 * İlk baytlar + dosya adı → kabul edilen tür; tanınmazsa `null`. İlk parçanın başı yeterli
 * (bütün imzalar ilk 12 baytta).
 */
export function masaDosyaTuru(bas: Uint8Array, dosyaAdi: string): MasaDosyaBilgisi | null {
  const ses = sesTuru(bas);
  if (ses) return { mime: ses, tur: 'SES', indirilir: false };

  const genel = sniffMime(Buffer.from(bas.buffer, bas.byteOffset, bas.byteLength));
  if (genel) return { mime: genel, tur: 'DOSYA', indirilir: false };

  const office = OFFICE_MIME[uzanti(dosyaAdi)];
  if (office && bas[0] === 0x50 && bas[1] === 0x4b && bas[2] === 0x03 && bas[3] === 0x04) {
    return { mime: office, tur: 'DOSYA', indirilir: true };
  }
  return null;
}
