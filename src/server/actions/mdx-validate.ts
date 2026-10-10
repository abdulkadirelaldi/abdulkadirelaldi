import { compileMDX } from 'next-mdx-remote/rsc';

import { MDX_OPTIONS } from '@/lib/mdx-options';
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
 * `components/public/mdx.tsx` ile AYNI derleyici (`next-mdx-remote/rsc`) ve —
 * T-053'ten beri — AYNI eklenti NESNESİ kullanılıyor; "aynı liste" değil,
 * tek bir `MDX_OPTIONS`. Ayrışırlarsa "önizlemede düzgündü ama kaydedilemedi"
 * (ya da tersi) sınıfından bir hata doğar — Frontend bu riski önizlemeyi public
 * bileşene bağlayarak kapattı; kaydetme tarafı da aynı yolu kullanmak zorunda.
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
 * ✅ ÇİFTLENME KALKTI — ÜÇ TURDA, HER ADIMI KENDİ KAPISIYLA (T-053).
 *
 * Eklenti listesi artık burada TANIMLI DEĞİL: kanonik tanım `@/lib/mdx-options`
 * ve bu dosya onu İÇE AKTARIYOR. Render yolu (`components/public/mdx.tsx`) da
 * aynı nesneyi okuyor, yani "önizlemede düzgündü ama kaydedilemedi" sınıfı
 * artık YAPISAL OLARAK imkânsız — ayrışacak ikinci bir liste yok.
 *
 * Kronoloji, çünkü hangi adımın neyi çözdüğü kaybolmasın:
 *
 *   T-047  liste burada ZORUNLU olarak çiftlendi (`mdx.tsx` ihraç etmiyordu) ve
 *          borç, ihraç edildiği gün kırılacak bir assert'le bırakıldı.
 *   T-049f ihraç yapıldı, kapı tasarlandığı gibi kırıldı. Çiftlenmeyi kaldırmayı
 *          denedim ve ÖLÇÜLEN bir duvara çarptım: `MDX_OPTIONS` bir `.tsx`
 *          modülündeydi, Vitest'in `unit` projesi (`environment: 'node'`, React
 *          eklentisi YOK) o dosyayı içe aktaran hiçbir modülü yükleyemiyordu —
 *          "Failed to parse source for import analysis … mdx.tsx:80:6".
 *          Üretim sınırı değil, test altyapısı sınırı; ama bağlayıcı.
 *          Üçüncü bir kopya AÇMADIM; engel bir assert'e bağlandı.
 *   T-051  Frontend tanımı JSX taşımayan `src/lib/mdx-options.ts`e TAŞIDI
 *          (çoğaltmadı). Engelin assert'i de tasarlandığı gibi kırıldı.
 *   T-053  duvar ölçümle kalkmış: kanonik modül `next-mdx-remote/rsc`'i YALNIZCA
 *          TİP olarak içe aktarıyor, çalışma zamanında yalnızca `rehype-sanitize`
 *          ve `remark-gfm` yükleniyor — ikisi de düz JS, `unit` projesi yüklüyor.
 *          Çiftlenme bu turda kaldırıldı.
 *
 * KAPI ARTIK NEYİ KORUYOR: eşleşme değil, TEKLİK. Gerekçesi testin kendi
 * başında (`tests/unit/actions/mdx-dogrulama.test.ts`).
 */

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
 *
 * `options` BİR KAÇIŞ TAŞIMIYOR — T-053'te ölçüldü. T-047'de burada
 * `MDX_OPTIONS as never` yazıyordu, çünkü yerel tanım `as const` ile
 * `readonly` diziler üretiyordu ve `SerializeOptions` DEĞİŞTİRİLEBİLİR
 * `Pluggable[]` istiyor. Kanonik modül tipi `MDXRemoteProps['options']` olarak
 * beyan ediyor ve `as const` taşımıyor, yani `compileMDX`in beklediği tipin
 * tam kendisi; kaçış kaldırıldı ve `pnpm typecheck` temiz. Bu önemsiz bir
 * temizlik değil: `as never` bir tip hatası olsa da susardı.
 */
export async function mdxCompileFailure(content: string): Promise<ApiFailure | null> {
  try {
    await compileMDX({ source: content, options: MDX_OPTIONS });
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
