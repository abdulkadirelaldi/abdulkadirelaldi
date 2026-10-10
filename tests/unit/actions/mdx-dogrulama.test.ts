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
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU EN ALTTAKİ: kapının public render yolundan
 * AYRIŞMASI, bu görevin açıkça uyardığı hata sınıfı ("önizlemede düzgündü ama
 * kaydedilemedi", ya da tersi). T-053'te o blok "iki liste eşleşiyor"dan
 * "liste TEK YERDE tanımlı"ya geçti — gerekçe bloğun kendi başında.
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
   * ═════════════════════════════════════════════════════════════════════════
   * KAPI DEĞİŞTİ — "EŞLEŞME" DEĞİL, "TEKLİK" ÖLÇÜLÜYOR (T-053)
   * ═════════════════════════════════════════════════════════════════════════
   *
   * T-053'e kadar bu blok İKİ ÇİFTLENMİŞ LİSTEYİ karşılaştırıyordu: `mdx.tsx`
   * ve `mdx-validate.ts` ayrı ayrı `remarkPlugins`/`rehypePlugins` tanımlıyor,
   * kapı ikisinin aynı olduğunu kaynaktan doğruluyordu. Çiftlenme kalktı ve o
   * beş iddia tasarlandığı gibi kırıldı.
   *
   * ⚠️ ESKİ İDDİALARI "DÜZELTMEK" YANLIŞ OLURDU. İki tarafın aynı listeyi
   * yazdığını assert etmek, artık VAR OLMAYAN bir sapmayı ölçmek demek: tek
   * kaynak olduğunda ayrışma yapısal olarak imkânsız, dolayısıyla o assert
   * hiçbir koşulda kırılmaz — ve T-050'de kendi testlerimde bulduğum sınıfın
   * aynısı olurdu ("izlediği şeyi okumayan değişmezlik testi hiçbir şey
   * korumaz"). Sapmayı ölçen bir kapıyı, sapma imkânsızlaştığında SİLMEK ya da
   * SORUYU DEĞİŞTİRMEK gerekir.
   *
   * KAPININ AMACI AYNI KALIYOR: kaydetme kapısı ile render yolu ayrışmasın.
   * Ama bugün o amacı tehdit eden tek şey ayrışma değil, GERİLEME: biri
   * (bir eklenti eklemek için, ya da bir içe aktarma döngüsünü çözmek için)
   * kendi tarafında YEREL BİR KOPYA açarsa çiftlenme geri gelir ve o gün
   * hiçbir test kırılmaz — iki kopya da doğru çalışır, sadece birlikte
   * değişmezler. T-047'de üç tur süren borç tam olarak buydu.
   *
   * Yani kapı artık şunu soruyor: **eklenti listesi KAÇ YERDE TANIMLI.**
   * Cevap "bir" olmak zorunda ve bu iddia kırılabilir — yerel bir kopya açmak
   * onu kırar. Eşleşme iddiasının aksine bu, bugün geçerli bir riski izliyor.
   */
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const KANONIK_YOL = 'src/lib/mdx-options.ts';

  const PUBLIC_MDX = kod('src/components/public/mdx.tsx');
  const KAPI = kod('src/server/actions/mdx-validate.ts');
  const KANONIK = kod(KANONIK_YOL);

  it('tarama vakum değil — üç kaynak da okundu', () => {
    /*
     * Sahte yeşil koruması. `toContain('MDXRemote')` İDDİASI KALDIRILDI ve
     * sebebi Frontend'in ölçümü: o dize `mdx.tsx`te artık yalnızca
     * `type MDXRemoteProps` içinde geçiyordu, yani iddia TESADÜFEN geçiyordu —
     * render yolunun gerçekten derleme yaptığını ölçmüyordu.
     *
     * `compileMDX` daha güçlü: İKİ TARAF DA onu çağırıyor, yani iddia
     * eşdeğerliğin kendisine dokunuyor. Kullanılan API değişirse burası önce
     * kırılır.
     */
    expect(PUBLIC_MDX).toContain('compileMDX');
    expect(KAPI).toContain('compileMDX');
    expect(KANONIK).toContain('MDX_OPTIONS');
  });

  it('AYNI paketten geliyor: next-mdx-remote/rsc', () => {
    expect(PUBLIC_MDX).toContain("from 'next-mdx-remote/rsc'");
    expect(KAPI).toContain("from 'next-mdx-remote/rsc'");
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * ⚠️⚠️ TEKLİK — bu bloğun kalbi
   * ──────────────────────────────────────────────────────────────────────── */

  it('İKİ TARAF DA kanonik modülden okuyor', () => {
    for (const [ad, kaynak] of [
      ['mdx.tsx (render)', PUBLIC_MDX],
      ['mdx-validate.ts (kaydetme kapısı)', KAPI],
    ] as const) {
      expect(kaynak, `${ad} MDX_OPTIONS'ı kanonik modülden içe aktarmıyor`).toMatch(
        /import\s*\{[^}]*MDX_OPTIONS[^}]*\}\s*from\s*'@\/lib\/mdx-options'/,
      );
    }
  });

  it('EKLENTİ LİSTESİ TEK YERDE TANIMLI — yerel kopya YOK', () => {
    /*
     * İddianın kırılma yolu somut: biri `mdx.tsx`e ya da `mdx-validate.ts`e
     * kendi `remarkPlugins`/`rehypePlugins` bloğunu yazarsa çiftlenme geri
     * gelir. Eklenti PAKETLERİNİN içe aktarılması da aranıyor, çünkü yerel bir
     * liste kurmanın ilk adımı o.
     */
    for (const [ad, kaynak] of [
      ['mdx.tsx', PUBLIC_MDX],
      ['mdx-validate.ts', KAPI],
    ] as const) {
      expect(kaynak, `${ad} yerel bir remark listesi tanımlıyor`).not.toMatch(/remarkPlugins\s*:/);
      expect(kaynak, `${ad} yerel bir rehype listesi tanımlıyor`).not.toMatch(/rehypePlugins\s*:/);
      expect(kaynak, `${ad} rehype-sanitize'ı doğrudan içe aktarıyor`).not.toContain(
        "from 'rehype-sanitize'",
      );
      expect(kaynak, `${ad} remark-gfm'i doğrudan içe aktarıyor`).not.toContain(
        "from 'remark-gfm'",
      );
      expect(kaynak, `${ad} ikinci bir MDX_OPTIONS tanımlıyor`).not.toMatch(
        /const\s+MDX_OPTIONS\s*[:=]/,
      );
    }
  });

  it('kanonik modül listeyi GERÇEKTEN taşıyor ve SANİTİZE ŞEMASI açık', () => {
    /*
     * Yukarıdaki iki iddia "başka yerde yok" diyor; bu iddia "burada var"
     * diyor. İkisi olmadan teklik ölçülmüş olmaz: listenin hiçbir yerde
     * olmadığı bir durumda da ilk ikisi yeşil kalırdı.
     *
     * Şema açıkça veriliyor — `defaultSchema` yerine genişletilmiş bir şemaya
     * geçmek saldırı yüzeyini genişletir ve bu assert o geçişi sessiz
     * bırakmıyor (`mdx.tsx`in başında varsayılan şemanın neyi kapattığı
     * ölçümle yazılı).
     */
    expect(KANONIK).toMatch(/remarkPlugins:\s*\[remarkGfm\]/);
    expect(KANONIK).toMatch(/rehypePlugins:\s*\[\[rehypeSanitize,\s*defaultSchema\]\]/);
    expect(KANONIK).toMatch(/export\s+const\s+MDX_OPTIONS/);
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * ÇİFTLENMEYİ KALDIRMANIN ÖNKOŞULU — ölçülmüş duvar, kapıya bağlandı
   * ──────────────────────────────────────────────────────────────────────── */

  it('kanonik modül JSX TAŞIMAYAN bir `.ts` dosyası', () => {
    /*
     * T-049f'te çiftlenme TAM OLARAK bu yüzden kaldırılamadı: liste bir `.tsx`
     * modülündeydi ve Vitest'in `unit` projesi (`environment: 'node'`, React
     * eklentisi YOK) onu içe aktaran hiçbir modülü yükleyemiyordu —
     * "Failed to parse source for import analysis … mdx.tsx:80:6".
     *
     * Duvar kalktığı için bu assert bugün yeşil; ama kalıcı, çünkü aynı duvara
     * geri yürümek mümkün. Geri yürünürse `pnpm test` zaten gürültülü bir
     * ayrıştırma hatasıyla düşer — bu assert o hatayı TEŞHİSE çeviriyor:
     * "modül yüklenemedi" yerine "kanonik modül `.tsx` olmuş" der.
     */
    expect(existsSync(join(KOK, KANONIK_YOL))).toBe(true);
    expect(KANONIK_YOL.endsWith('.ts')).toBe(true);
  });

  it('kanonik modül next-mdx-remote`u YALNIZCA TİP olarak içe aktarıyor', () => {
    /*
     * Duvarın kalkmasının ölçülen sebebi bu (Orkestra Şefi, T-053): çalışma
     * zamanında yalnızca `rehype-sanitize` ve `remark-gfm` yükleniyor, ikisi
     * de düz JS. Değer içe aktarmasına çevrilirse modül React'in JSX
     * çalışma zamanını node ortamına taşır ve duvar geri gelebilir.
     */
    expect(KANONIK).toMatch(/import\s+type\s*\{[^}]*MDXRemoteProps[^}]*\}\s*from/);
    expect(KANONIK).not.toMatch(/import\s*\{[^}]*compileMDX[^}]*\}\s*from/);
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
