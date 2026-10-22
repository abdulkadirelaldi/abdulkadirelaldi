import { describe, expect, it } from 'vitest';

import { DILLER } from '@/i18n/diller';
import { cozumle, PARCA, SAYFALAR, yol, yolSorgulu } from '@/i18n/rotalar';

/**
 * ADR-046 — adres tablosu. Middleware, dil seçici ve hreflang bu tek tabloyu
 * okuyor; bir yön (yol → çözüm) bozulursa dil değiştirici 404'e götürür.
 */
describe('yol()', () => {
  it('Türkçe öneksiz, diğer diller önekli ve yerelleştirilmiş', () => {
    expect(yol('tr', 'anasayfa')).toBe('/');
    expect(yol('en', 'anasayfa')).toBe('/en');
    expect(yol('tr', 'projeler', 'x')).toBe('/projeler/x');
    expect(yol('en', 'projeler', 'x')).toBe('/en/projects/x');
    expect(yol('de', 'hakkimda')).toBe('/de/ueber-mich');
    expect(yol('de', 'cv')).toBe('/de/lebenslauf');
  });

  it('sorgu boş değerleri atlıyor', () => {
    expect(yolSorgulu('en', 'blog', { etiket: 'ai', x: undefined })).toBe('/en/blog?etiket=ai');
    expect(yolSorgulu('tr', 'projeler', {})).toBe('/projeler');
  });
});

describe('cozumle()', () => {
  it.each(
    DILLER.flatMap((dil) =>
      SAYFALAR.flatMap((sayfa) => [
        [dil, sayfa, undefined],
        ...(sayfa === 'projeler' || sayfa === 'blog' ? [[dil, sayfa, 'bir-slug']] : []),
      ]),
    ) as [(typeof DILLER)[number], (typeof SAYFALAR)[number], string | undefined][],
  )('gidiş-dönüş: %s / %s / %s', (dil, sayfa, slug) => {
    const c = cozumle(yol(dil, sayfa, slug));
    expect(c).toMatchObject({ tur: 'sayfa', dil, sayfa, ...(slug ? { slug } : {}) });
  });

  it('önekli dilin iç yolu Türkçe rota adını kullanıyor (rewrite hedefi)', () => {
    expect(cozumle('/en/projects/x')).toMatchObject({ icYol: '/en/projeler/x' });
    expect(cozumle('/de/kontakt')).toMatchObject({ icYol: '/de/iletisim' });
    expect(cozumle('/de')).toMatchObject({ icYol: '/de' });
  });

  it('kanonik olmayan yazımlar yönlendiriliyor', () => {
    expect(cozumle('/tr/projeler')).toEqual({ tur: 'yonlendir', hedef: '/projeler' });
    expect(cozumle('/tr')).toEqual({ tur: 'yonlendir', hedef: '/' });
    expect(cozumle('/en/projeler/x')).toEqual({ tur: 'yonlendir', hedef: '/en/projects/x' });
    expect(cozumle('/de/hakkimda')).toEqual({ tur: 'yonlendir', hedef: '/de/ueber-mich' });
  });

  it('public olmayan adreslere dokunmuyor', () => {
    for (const p of ['/panel', '/api/v1/health', '/giris', '/en/yok-boyle', '/sitemap.xml']) {
      expect(cozumle(p), p).toEqual({ tur: 'disarida' });
    }
  });

  it('her dilde parçalar tekil — iki sayfa aynı adresi paylaşamaz', () => {
    for (const dil of DILLER) {
      const p = SAYFALAR.map((s) => PARCA[s][dil]).filter(Boolean);
      expect(new Set(p).size, dil).toBe(p.length);
    }
  });
});
