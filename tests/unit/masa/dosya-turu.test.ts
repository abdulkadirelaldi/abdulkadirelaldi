import { describe, expect, it } from 'vitest';

import { boyutMetni, indirilirMi } from '@/lib/masa/dosya-sinirlari';
import { masaDosyaTuru } from '@/lib/masa/dosya-turu';

/** MASA DOSYA TÜRLERİ (ADR-049 M2b) — tür BAYTLARDAN; uzantı yalnızca ZIP'i ayırt eder. */
const bayt = (...b: (number | string)[]) =>
  new Uint8Array(
    b.flatMap((x) => (typeof x === 'string' ? [...x].map((c) => c.charCodeAt(0)) : [x])),
  );
const ftyp = (marka: string) => bayt(0, 0, 0, 0x20, 'ftyp', marka, 0, 0, 0, 0);

describe('masaDosyaTuru', () => {
  it('ses kapları: iPhone Sesli Not (M4A), mp3 (ID3 ve çerçeve), wav, webm, ogg', () => {
    expect(masaDosyaTuru(ftyp('M4A '), 'Kayıt.m4a')).toEqual({
      mime: 'audio/mp4',
      tur: 'SES',
      indirilir: false,
    });
    expect(masaDosyaTuru(bayt('ID3', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0), 'a.mp3')?.mime).toBe(
      'audio/mpeg',
    );
    expect(masaDosyaTuru(bayt(0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0), 'a.mp3')?.mime).toBe(
      'audio/mpeg',
    );
    expect(masaDosyaTuru(bayt('RIFF', 0, 0, 0, 0, 'WAVE'), 'a.wav')?.mime).toBe('audio/wav');
    expect(masaDosyaTuru(bayt(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0), 'kayit')?.mime).toBe(
      'audio/webm',
    );
    expect(masaDosyaTuru(bayt('OggS', 0, 0, 0, 0, 0, 0, 0, 0), 'a.opus')?.mime).toBe('audio/ogg');
  });

  it('belgeler: PDF ve görsel genel tespitten; AVIF ses sanılmaz', () => {
    expect(masaDosyaTuru(bayt('%PDF-1.7', 0, 0, 0, 0), 'odev.pdf')).toEqual({
      mime: 'application/pdf',
      tur: 'DOSYA',
      indirilir: false,
    });
    expect(masaDosyaTuru(ftyp('avif'), 'a.avif')?.mime).toBe('image/avif');
  });

  it('⚠️ ZIP yalnızca Office uzantısıyla kabul edilir ve İNDİRİLİR', () => {
    const zip = bayt(0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(masaDosyaTuru(zip, 'Ödev.DOCX')).toMatchObject({ tur: 'DOSYA', indirilir: true });
    expect(masaDosyaTuru(zip, 'arsiv.zip')).toBeNull();
    expect(masaDosyaTuru(zip, 'kotu.exe')).toBeNull();
  });

  it('uzantı yalan söylerse içerik kazanır; tanınmayan bayt reddedilir', () => {
    expect(masaDosyaTuru(bayt('MZ', 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0), 'ders.m4a')).toBeNull();
    expect(masaDosyaTuru(bayt('<html>', 0, 0, 0, 0, 0, 0), 'not.pdf')).toBeNull();
    expect(masaDosyaTuru(bayt(1, 2), 'a.mp3')).toBeNull();
  });
});

describe('boyutMetni · indirilirMi', () => {
  it('MB/KB biçimi ve Office MIME', () => {
    expect(boyutMetni(12.4 * 1024 * 1024)).toBe('12,4 MB');
    expect(boyutMetni(850 * 1024)).toBe('850 KB');
    expect(boyutMetni(10)).toBe('1 KB');
    expect(
      indirilirMi('application/vnd.openxmlformats-officedocument.presentationml.presentation'),
    ).toBe(true);
    expect(indirilirMi('application/pdf')).toBe(false);
  });
});
