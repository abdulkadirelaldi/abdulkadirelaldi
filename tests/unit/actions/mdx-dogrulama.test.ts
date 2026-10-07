import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mdxCompileFailure, mdxErrorReason } from '@/server/actions/mdx-validate';

/**
 * MDX DOĞRULAMA KAPISI — T-047, P0 (public 500).
 *
 * Ölçülen kusur: geçersiz MDX kaydedilebiliyordu, `/blog/<slug>` 500 veriyordu
 * ve liste + RSS + sitemap o kırık adresi tanıtmaya devam ediyordu.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "eklenti listesi eşleşiyor" — kapının public
 * render yolundan AYRIŞMASI, bu görevin açıkça uyardığı hata sınıfı
 * ("önizlemede düzgündü ama kaydedilemedi", ya da tersi).
 */

const KOK = resolve(__dirname, '../../..');

/* ===========================================================================
 * REDDEDİLENLER — ölçülen 500 sınıfı
 * ======================================================================== */

describe('geçersiz MDX REDDEDİLİYOR', () => {
  const GECERSIZ = [
    ['kapatılmamış <img> (ölçülen 500)', 'Metin\n\n<img src="/x.png">\n'],
    ['kapatılmamış <div>', '<div>\n\naçık kaldı\n'],
    ['bozuk ifade', '{ bozuk ===== }\n'],
    ['kapatılmamış <br>', 'satır<br>\n'],
  ] as const;

  it.each(GECERSIZ)('%s', async (_ad, kaynak) => {
    const hata = await mdxCompileFailure(kaynak);

    expect(hata).not.toBeNull();
    expect(hata?.ok).toBe(false);
    expect(hata?.error.code).toBe('VALIDATION_ERROR');
    // `fields` anahtarı FORM ALAN ADIYLA birebir — Frontend doğrudan basabilir.
    expect(hata?.error.fields?.content).toBeTruthy();
  });

  it('genel mesaj önizlemenin BAŞLIĞIYLA aynı dili konuşuyor', async () => {
    const hata = await mdxCompileFailure('<img src="/x.png">\n');
    // `onizleme-sinir.tsx`: "MDX derlenemedi — bu hâliyle sitede de yayınlanamaz"
    expect(hata?.error.message).toContain('MDX olarak derlenemedi');
    expect(hata?.error.message).toContain('sitede yayınlanamaz');
  });
});

/* ===========================================================================
 * ⚠️ SATIR/SÜTUN KORUNUYOR — yazarın tek ipucu
 * ======================================================================== */

describe('satır/sütun bilgisi korunuyor', () => {
  it('mesajda derleyicinin satır:sütun aralığı var', async () => {
    // Hata beşinci satırda; derleyici `(5:1-5:19)` üretiyor.
    const hata = await mdxCompileFailure('bir\n\niki\n\n<img src="/x.png">\n');
    const alan = hata?.error.fields?.content ?? '';

    expect(alan).toMatch(/\(\d+:\d+-\d+:\d+\)/);
    expect(alan).toContain('5:1');
  });

  it('derleyicinin KENDİ cümlesi korunuyor — yeniden yazılmıyor', async () => {
    const hata = await mdxCompileFailure('<img src="/x.png">\n');
    // Kısaltmak ya da "bir şeyler ters gitti"ye indirgemek, yazarın elindeki
    // tek ipucunu almak olurdu (`onizleme-sinir.tsx` aynı gerekçeyi yazıyor).
    expect(hata?.error.fields?.content).toContain('Expected a closing tag');
  });

  it('wrapper öneki ve sabit bağlantı AYIKLANIYOR', async () => {
    const hata = await mdxCompileFailure('<div>\n');
    const alan = hata?.error.fields?.content ?? '';

    expect(alan).not.toContain('[next-mdx-remote]');
    expect(alan).not.toContain('More information');
    expect(alan).not.toContain('https://mdxjs.com');
  });

  it('kod çerçevesi satırları alana GİRMİYOR — tek satır kalıyor', async () => {
    const hata = await mdxCompileFailure('bir\n\niki\n\n<img src="/x.png">\n');
    const alan = hata?.error.fields?.content ?? '';

    expect(alan).not.toContain('\n');
    expect(alan).not.toMatch(/^\s*\d+\s*\|/);
  });

  it('mdxErrorReason biçim değişirse SESSİZ KALMIYOR', () => {
    // Derleyici bir gün sadece kod çerçevesi döndürürse boş mesaj basılmamalı.
    expect(
      mdxErrorReason(new Error('[next-mdx-remote] error compiling MDX:\n  3 | x\n  | ^')),
    ).toBe('MDX derlenemedi (ayrıntı alınamadı).');
    expect(mdxErrorReason('düz dize')).toBe('düz dize');
  });
});

/* ===========================================================================
 * ⚠️ KABUL EDİLENLER — sanitize'in işi KAYDETMEYİ engellemiyor
 * ======================================================================== */

describe('GEÇERLİ MDX kaydedilebiliyor — sanitize render’da temizliyor', () => {
  /**
   * Bu blok bir kararı sabitliyor: `<script>`/`onerror`/`javascript:` GEÇERLİ
   * MDX'tir ve `rehype-sanitize` onları RENDER sırasında temizliyor
   * (`mdx.tsx`te ölçülmüş). Kaydetmeyi engellemek AYRI bir karar olurdu ve
   * görev kartı açıkça "verme" dedi — yazarın `<script>` kelimesini bir kod
   * bloğunda anlatması meşru.
   */
  const GECERLI = [
    ['sade markdown', '# Başlık\n\nMetin **kalın**.'],
    ['<script> — sanitize düşürür', '# A\n\n<script>alert(1)</script>\n'],
    ['onerror — sanitize düşürür', '<img src="x" onerror="alert(1)" />\n'],
    ['javascript: href — sanitize düşürür', '[tık](javascript:alert(1))\n'],
    ['GFM tablo', '| a | b |\n| - | - |\n| 1 | 2 |\n'],
    ['görev listesi', '- [x] bitti\n- [ ] kaldı\n'],
    ['kod bloğunda etiket', '```html\n<img src="x">\n```\n'],
    ['kapatılmış img', '<img src="/x.png" />\n'],
    ['boş içerik', ''],
  ] as const;

  it.each(GECERLI)('%s KABUL EDİLİYOR', async (_ad, kaynak) => {
    expect(await mdxCompileFailure(kaynak)).toBeNull();
  });

  it('kod bloğundaki kapatılmamış etiket REDDEDİLMİYOR — ayrım gerçek', async () => {
    // Çitlerin içi derlenmiyor; bunu reddetmek yazarın MDX anlatmasını yasaklardı.
    expect(await mdxCompileFailure('```\n<img src="x">\n```\n')).toBeNull();
    // Ama çit DIŞINDA aynı metin reddediliyor.
    expect(await mdxCompileFailure('<img src="x">\n')).not.toBeNull();
  });
});

/* ===========================================================================
 * ⚠️⚠️ EN KRİTİK: PUBLIC RENDER YOLUYLA EKLENTİ LİSTESİ EŞLEŞİYOR
 * ======================================================================== */

describe('kapı public render yolundan AYRIŞMIYOR', () => {
  /**
   * `mdx.tsx` eklenti listesini İHRAÇ ETMİYOR ve o dosya Frontend'in (§10.1),
   * bu yüzden liste `mdx-validate.ts`te ÇİFTLENMİŞ durumda. Çiftlenme sessizce
   * sapabilir: Frontend bir eklenti eklerse kapı eski yolu ölçmeye devam eder
   * ve "önizlemede düzgündü ama kaydedilemedi" (ya da tersi) doğar.
   *
   * Bu blok iki kaynağı okuyup eşleştiriyor. Kalıcı çözüm listenin tek yerden
   * ihracı; raporda bulgu olarak açıldı. O gelene kadar kapı burada.
   */
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const PUBLIC_MDX = kod('src/components/public/mdx.tsx');
  const KAPI = kod('src/server/actions/mdx-validate.ts');

  it('tarama vakum değil — iki kaynak da okundu', () => {
    expect(PUBLIC_MDX).toContain('MDXRemote');
    expect(KAPI).toContain('compileMDX');
  });

  it('AYNI paketten geliyor: next-mdx-remote/rsc', () => {
    expect(PUBLIC_MDX).toContain("from 'next-mdx-remote/rsc'");
    expect(KAPI).toContain("from 'next-mdx-remote/rsc'");
  });

  it('remark eklentileri AYNI', () => {
    for (const kaynak of [PUBLIC_MDX, KAPI]) {
      expect(kaynak).toMatch(/remarkPlugins:\s*\[remarkGfm\]/);
    }
  });

  it('rehype eklentileri ve SANITIZE ŞEMASI aynı', () => {
    for (const kaynak of [PUBLIC_MDX, KAPI]) {
      // Şema açıkça veriliyor; `defaultSchema` yerine genişletilmiş bir şemaya
      // geçilirse iki taraf birlikte geçmek zorunda.
      expect(kaynak).toMatch(/rehypePlugins:\s*\[\[rehypeSanitize,\s*defaultSchema\]\]/);
    }
  });

  /**
   * HATIRLATICI ATEŞLENDİ — ve yerine ÖLÇÜLMÜŞ bir engel kaydı geçti (T-050).
   *
   * T-047'de bu assert'in TERSİ vardı (`not.toMatch`): borç, ihraç edildiği gün
   * kırılacak bir kapıyla bırakılmıştı. Frontend T-049f'te ihracı yaptı, kapı
   * kırıldı — tasarlandığı gibi — ve çiftlenmeyi kaldırmayı denedim.
   *
   * KALDIRILAMADI: `MDX_OPTIONS` bir `.tsx` modülünde ve Vitest'in `unit`
   * projesi (environment `node`, React eklentisi YOK) o dosyayı içe aktaran
   * hiçbir modülü yükleyemiyor — dört eylemin birim testi düşüyor. Üretim
   * sınırı değil, test altyapısı sınırı; ama `pnpm test` yeşil kalmak zorunda.
   *
   * Çözüm seçeneklerin `.ts` bir modüle taşınması; `mdx.tsx` Frontend'in,
   * dolayısıyla o adım onların turunda. Bu iki assert o durumu SABİTLİYOR:
   * ihraç var (borcun yarısı kapandı), ama çiftlenme sürüyor (yarısı açık).
   */
  it('ihraç YAPILDI — borcun yarısı kapandı', () => {
    expect(PUBLIC_MDX).toMatch(/export\s+const\s+MDX_OPTIONS/);
  });

  it('ama kanonik liste HÂLÂ `.tsx` içinde — çiftlenme bu yüzden sürüyor', () => {
    /*
     * Bu assert kırıldığı gün (`.ts` modüle taşındığı gün) çiftlenme
     * kaldırılabilir hâle gelir. Yani engel de kendini hatırlatıyor — T-047'de
     * borcun kendisi için kurulan kalıbın aynısı, bir seviye yukarıda.
     */
    const kanonikYol = 'src/components/public/mdx.tsx';
    expect(kanonikYol.endsWith('.tsx')).toBe(true);
    // Seçenekleri taşıyacak `.ts` modül HENÜZ YOK.
    expect(existsSync(join(KOK, 'src/lib/mdx-options.ts'))).toBe(false);
  });
});

/* ===========================================================================
 * PROJECT.CONTENT — aynı kapı gerekli miydi
 * ======================================================================== */

describe('Project.content da aynı kapıdan geçiyor', () => {
  /**
   * ÖLÇÜLDÜ: `/projeler/[slug]/page.tsx` AYNI `Mdx` bileşenini `proje.content`
   * ile çağırıyor (`<Mdx kaynak={proje.content} />`). Yani aynı 500 oradan da
   * gelir ve kapı oraya da gerekli.
   */
  it('proje detay sayfası aynı Mdx bileşenini kullanıyor', () => {
    const sayfa = readFileSync(join(KOK, 'src/app/(public)/projeler/[slug]/page.tsx'), 'utf8');
    expect(sayfa).toContain("from '@/components/public/mdx'");
    expect(sayfa).toMatch(/<Mdx\s+kaynak=\{proje\.content\}/);
  });

  it('dört eylemin HEPSİ kapıyı çağırıyor', () => {
    for (const yol of ['src/server/actions/post.ts', 'src/server/actions/project.ts']) {
      const kaynak = readFileSync(join(KOK, yol), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*$/gm, ' ');

      // create + update = iki çağrı, her dosyada.
      const cagrilar = kaynak.match(/mdxCompileFailure\(/g) ?? [];
      expect(cagrilar, `${yol} kapıyı iki kez çağırmıyor`).toHaveLength(2);
    }
  });

  it('ARŞİVLEME kapıyı çağırmıyor — içerik göndermiyor', () => {
    // `archiveXAction` yalnızca `{ id }` alıyor; derleme maliyeti anlamsız olurdu.
    const kaynak = readFileSync(join(KOK, 'src/server/actions/post.ts'), 'utf8');
    const arsiv = kaynak.slice(kaynak.indexOf('export async function archivePostAction'));
    expect(arsiv).not.toContain('mdxCompileFailure');
  });
});
