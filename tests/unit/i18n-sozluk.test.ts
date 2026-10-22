import { describe, expect, it } from 'vitest';

import { DILLER, type Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import { AYLAR_KISA, AYLAR_UZUN, DEVAM } from '@/i18n/tarih';

/**
 * ADR-046 — sözlük kalite kapısı.
 *
 * Şekil eşitliğini tip sistemi zaten zorluyor (`en: Sozluk`). Buradaki
 * denetimler tipin GÖREMEDİKLERİ:
 *   1. Boş metin — `''` tipe uyar ama sayfada delik açar.
 *   2. Yanlış dilde kalmış metin — İngilizce/Almanca sözlükte Türkçeye özgü
 *      harf (ğ, ş, ı, İ…) kopyala-yapıştır kalıntısıdır. Özel adlar hariç.
 *   3. Almancada hitap tutarlılığı: site resmî "Sie" kullanıyor (ADR-046);
 *      tek bir "du" metni karışık ve özensiz görünür.
 *   4. Metin üreten işlevler gerçek bir metin döndürüyor (yer tutucu sızmıyor).
 */

/** Sözlükteki her metin — işlevler örnek girdiyle çağrılıp metne çevrilir. */
function metinler(deger: unknown, yol = ''): [string, string][] {
  if (typeof deger === 'string') return [[yol, deger]];
  if (typeof deger === 'function') {
    const sonuc = (deger as (...a: unknown[]) => unknown)('Örnek', 2, true);
    return metinler(sonuc, `${yol}()`);
  }
  if (deger && typeof deger === 'object') {
    return Object.entries(deger).flatMap(([k, v]) => metinler(v, yol ? `${yol}.${k}` : k));
  }
  return [[yol, String(deger)]];
}

/** Türkçe harf taşıması MEŞRU olan özel adlar — metinden çıkarılıp öyle bakılır. */
const OZEL_ADLAR = ['Kıyı Medya', 'Elaldı', 'Türkiye', 'İSÇEV', 'Örnek'];
const TURKCE_HARF = /[ğĞşŞıİ]/;

function ozelAdlarsiz(metin: string): string {
  return OZEL_ADLAR.reduce((m, ad) => m.replaceAll(ad, ''), metin);
}

describe('ADR-046 · sözlükler', () => {
  for (const dil of DILLER) {
    describe(dil, () => {
      const hepsi = metinler(sozluk(dil));

      it('boş metin yok', () => {
        // `kiyiSonra` gibi noktalama parçaları kısa olabilir, ama BOŞ olamaz.
        const bos = hepsi.filter(([, m]) => m.trim() === '').map(([y]) => y);
        expect(bos).toEqual([]);
      });

      it('yer tutucu ya da tanımsız değer sızmıyor', () => {
        const sizan = hepsi
          .filter(([, m]) => /undefined|NaN|\[object |TODO|\{[a-z]+\}/.test(m))
          // Form metinleri `{eposta}` / `{n}` yer tutucusunu BİLEREK taşıyor:
          // istemcide doldurulur (işlev istemciye geçemiyor).
          .filter(([y, m]) => !(y.startsWith('form.') && /\{(eposta|n)\}/.test(m)))
          .map(([y]) => y);
        expect(sizan).toEqual([]);
      });

      if (dil !== 'tr') {
        it('Türkçeye özgü harf kalmamış (özel adlar hariç)', () => {
          const kalan = hepsi
            .filter(([, m]) => TURKCE_HARF.test(ozelAdlarsiz(m)))
            .map(([y, m]) => `${y}: ${m}`);
          expect(kalan).toEqual([]);
        });
      }
    });
  }

  it('Türkçe ile aynı kalan metin yalnızca dilden bağımsız olanlar', () => {
    // Çevrilmeyi UNUTMANIN en sık izi: metin Türkçesiyle birebir aynı.
    const tr = new Map(metinler(sozluk('tr')));
    // Dilden bağımsız ya da iki dilde AYNI yazılan sözcükler (Almanca "Menü",
    // "Telefon" Türkçesiyle birebir aynı ve doğru).
    const IZINLI =
      /^(Blog|CV|Backend|Frontend|Menü|Telefon|abdulkadir@site|cd \.\.\/blog|[\s.·—–:()0-9→]*)$/;
    for (const dil of ['en', 'de'] as const) {
      const ayni = metinler(sozluk(dil))
        .filter(
          ([y, m]) => tr.get(y) === m && !IZINLI.test(m) && !y.startsWith('projelerBolum.kod'),
        )
        .map(([y, m]) => `${dil}.${y}: ${m}`);
      expect(ayni).toEqual([]);
    }
  });

  it('Almanca resmî hitap — "du/dein" yok', () => {
    const gayriResmi = metinler(sozluk('de'))
      .filter(([, m]) => /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(m))
      .map(([y, m]) => `${y}: ${m}`);
    expect(gayriResmi).toEqual([]);
  });

  it('tarih metinleri her dilde 12 ay ve "devam" karşılığı', () => {
    for (const dil of DILLER as readonly Dil[]) {
      expect(AYLAR_KISA[dil]).toHaveLength(12);
      expect(AYLAR_UZUN[dil]).toHaveLength(12);
      expect(DEVAM[dil].trim()).not.toBe('');
    }
  });
});
