import { compileMDX } from 'next-mdx-remote/rsc';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { fail, type ApiFailure } from '@/server/services/_shared';

/**
 * MDX DOĞRULAMA KAPISI — T-047, P0 (public 500).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE KORUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Geçersiz MDX veritabanına yazılabiliyordu ve detay sayfası HTTP 500 veriyordu.
 * Ölçülen yarıçap (Orkestra Şefi, 2026-09-21):
 *
 *   /blog/<geçersiz>  500   ← kırık
 *   /blog             200   ← liste o adresi TANITMAYA DEVAM EDİYOR
 *   /rss.xml          200   ← besleme de
 *   /sitemap.xml      200   ← arama motoruna "bunu tara" diyor
 *
 * Zarar "bir sayfa bozuk" değil, **"aktif olarak yönlendirdiğimiz bir sayfa
 * bozuk"**: okuyucu listeden tıklar ve 500 alır, arama motoru sitemap'ten gelir
 * ve 500 alır. Kusur T-024/T-025'ten beri vardı ama MDX yazacak ekran yoktu;
 * T-035 ekranı açtı ve yolu da açtı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ NEDEN ŞEMADA DEĞİL — §7.3 İLE GERİLİM VE ÇÖZÜMÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §7.3 "kural şemada yaşar" diyor ve bu kural iyi bir kural. Ama `src/lib/
 * schemas/**` modülleri İSTEMCİYE DE GİDİYOR: `toFormSchema` ile türetilen form
 * şemaları tarayıcıda koşuyor (T-031 konvansiyonu). MDX derleyicisini oraya
 * koymak, derleyiciyi her panel formunun yığınına sokardı — §5.2'nin yasağı.
 *
 * `serverInterpreted` ile işaretlemek de YANLIŞ ARAÇ olurdu ve bu ayrımı T-042s'te
 * `totpCode` için de yapmıştım: o konvansiyon, Zod'un istemcide koşan bir
 * kuralının gönderimi YANLIŞLIKLA ENGELLEDİĞİ alanlar içindir. `content`te
 * durum tersi — şemadaki kurallar (`min(1)`, `max`) istemcide DOĞRU ve YARARLI
 * çalışıyor; `serverInterpreted` alanı form şemasından tamamen çıkarır ve
 * "İçerik zorunludur" kuralını da götürürdü. Bir kuralı taşımak için başka bir
 * kuralı feda etmek olurdu.
 *
 * ÇÖZÜM: kural TEK YERDE yaşıyor — burada. §7.3'ün yasakladığı şey aynı kuralın
 * İKİ YERE yazılması; bir kuralın şema yerine eylem katmanında yaşaması değil.
 * `schemas/post.ts` ve `schemas/project.ts` bu dosyaya İŞARET EDİYOR, yani kural
 * nerede olduğunu söylemeden kaybolmuyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ PUBLIC RENDER YOLUYLA AYNI SONUÇ — ÖLÇÜLDÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `components/public/mdx.tsx` ile AYNI derleyici (`next-mdx-remote/rsc`) ve
 * AYNI eklenti listesi kullanılıyor. Ayrışırlarsa "önizlemede düzgündü ama
 * kaydedilemedi" (ya da tersi) sınıfından bir hata doğar — Frontend bu riski
 * önizlemeyi public bileşene bağlayarak kapattı; kaydetme tarafı da aynı yolu
 * kullanmak zorunda.
 *
 * ÖLÇÜLEN DAVRANIŞ (tests/unit/actions/mdx-dogrulama.test.ts):
 *   kapatılmamış <img>, kapatılmamış <div>, bozuk {ifade}  → REDDEDİLİYOR
 *   <script>, onerror=, javascript:                        → KABUL EDİLİYOR
 *
 * İkinci satır kasıtlı: onlar GEÇERLİ MDX'tir ve `rehype-sanitize` render
 * sırasında temizliyor (`mdx.tsx`te ölçülmüş). Kaydetmeyi engellemek AYRI bir
 * karar olurdu ve verilmedi — yazarın `<script>` kelimesini bir kod bloğunda
 * anlatması meşru.
 *
 * BİLİNEN SINIR: bu kapı DERLEME aşamasını ölçüyor. Derlenip RENDER aşamasında
 * patlayan bir girdi teorik olarak geçebilir. Ölçümde böyle bir vaka bulunamadı
 * (bilinmeyen bileşen `<Ozel />` derleniyor ve sanitize JSX düğümünü düşürüyor,
 * yani render de patlamıyor) — ama kapı "hiçbir 500 kalmadı" diye değil,
 * "ölçülen 500 sınıfı kapandı" diye okunmalı.
 *
 * ⚠️ EKLENTİ LİSTESİ HÂLÂ ÇİFTLENMİŞ — VE NEDEN KALDIRILAMADIĞI ÖLÇÜLDÜ (T-050).
 *
 * T-047'de çiftlenme bir BORÇ olarak bırakılmıştı ve kapı testi `mdx.tsx`te
 * `export const MDX_OPTIONS` ARAMIYOR OLDUĞUNU assert ediyordu — ihraç edildiği
 * gün kırılsın diye. Frontend T-049f'te ihracı yaptı, kapı KIRILDI (tasarlandığı
 * gibi) ve çiftlenmeyi kaldırmayı denedim.
 *
 * KALDIRILAMADI, ve sebebi ölçüm: `MDX_OPTIONS` bir **`.tsx`** modülünde
 * (`components/public/mdx.tsx`). Buradan içe aktarıldığında Vitest'in `unit`
 * projesi bu dosyayı — ve onu içe aktaran DÖRT EYLEMİ — hiç yükleyemiyor:
 *
 *   Failed to parse source for import analysis because the content contains
 *   invalid JS syntax … src/components/public/mdx.tsx:80:6
 *
 * Çünkü `unit` projesi `environment: 'node'` ve React eklentisi YOK (JSX'i
 * yalnızca `component` projesi çözüyor, o da `*.test.tsx` koşuyor).
 *
 * Bu bir ÜRETİM sınırı değil — Next JSX'i her yerde derler. Bir TEST ALTYAPISI
 * sınırı, ama bağlayıcı: `pnpm test` yeşil kalmak zorunda ve dört eylemin
 * birim testi bu modülden geçiyor.
 *
 * ÇÖZÜM, ÇİFTLENMEYİ KALDIRMAK İÇİN: seçenekler `.ts` bir modüle taşınmalı
 * (ör. `src/lib/mdx-options.ts`) ve İKİ taraf da oradan içe aktarmalı.
 * `mdx.tsx` Frontend'in (§10.1), bu yüzden o adım bu turda yapılamadı; rapora
 * bulgu olarak yazıldı. Kendi tarafımda yeni bir tanım AÇMADIM: bugün tek
 * kanonik liste `mdx.tsx`te ve üçüncü bir kopya durumu kötüleştirirdi.
 *
 * O GÜNE KADAR kapı duruyor: `tests/unit/actions/mdx-dogrulama.test.ts`
 * İKİSİNİN EŞLEŞTİĞİNİ kaynaktan doğruluyor, yani sapma sessiz kalamaz.
 */

/**
 * Public render yolundaki eklenti listesinin AYNISI.
 *
 * Sıra önemli ve `mdx.tsx`ten devralındı: `sanitize` EN SONDA çalışır, yoksa
 * sonraki bir eklentinin ürettiği düğümler denetimden geçmemiş olurdu.
 */
const MDX_OPTIONS = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypeSanitize, defaultSchema]],
  },
} as const;

/**
 * Derleyicinin çok satırlı mesajından YAZARA YARAYAN satırı ayıklar.
 *
 * `next-mdx-remote` mesajı şu şekilde kuruyor:
 *
 *     [next-mdx-remote] error compiling MDX:        ← kendi öneki
 *     Expected a closing tag for `<img>` (5:1-5:19) ← ASIL BİLGİ, satır/sütun burada
 *                                                   ← @babel/code-frame bloğu
 *     More information: https://mdxjs.com/...        ← sabit bağlantı
 *
 * İkinci satır alınıyor ve OLDUĞU GİBİ korunuyor — SATIR/SÜTUN YAZARIN HATAYI
 * BULMASININ TEK İPUCU. Frontend önizlemede `hata.message`i aynen gösteriyor
 * (`onizleme-sinir.tsx`), yani form alanına basılan bu metin önizlemedekinin
 * birebir alt kümesi oluyor: iki yüzey aynı şeyi söylüyor.
 *
 * Kod çerçevesi ve bağlantı alınmıyor: form alanının altındaki tek satıra
 * sığmaz ve yazarın elinde zaten editör var.
 */
export function mdxErrorReason(error: unknown): string {
  const ham = error instanceof Error ? error.message : String(error);

  const satirlar = ham
    .split('\n')
    .map((satir) => satir.trim())
    .filter((satir) => satir.length > 0)
    .filter((satir) => !satir.startsWith('[next-mdx-remote]'))
    .filter((satir) => !satir.startsWith('More information:'));

  // Kod çerçevesi satırları `3 | …`, `> 5 | …` ya da `| ^` biçiminde.
  const sebep = satirlar.find((satir) => !/^>?\s*\d*\s*\|/.test(satir));

  // Biçim bir gün değişirse sessizce boş mesaj dönmesin.
  return sebep ?? 'MDX derlenemedi (ayrıntı alınamadı).';
}

/**
 * `content` MDX olarak derlenebiliyor mu — derlenemezse §7.2 zarfı döner.
 *
 * `null` = geçerli. Çağıran taraf `if (hata) return hata;` yazar; iki satır,
 * ve §7.1 sırasındaki yeri AÇIKÇA görünür (Zod'dan sonra, servisten önce).
 *
 * `fields.content` FORM ALAN ADIYLA birebir: Frontend hatayı doğrudan içerik
 * alanının altına basabilir.
 */
export async function mdxCompileFailure(content: string): Promise<ApiFailure | null> {
  try {
    await compileMDX({ source: content, options: MDX_OPTIONS as never });
    return null;
  } catch (error) {
    return fail(
      'VALIDATION_ERROR',
      // Önizlemenin başlığıyla AYNI cümle — iki yüzey aynı dili konuşsun.
      'İçerik MDX olarak derlenemedi — bu hâliyle sitede yayınlanamaz.',
      { content: mdxErrorReason(error) },
    );
  }
}
