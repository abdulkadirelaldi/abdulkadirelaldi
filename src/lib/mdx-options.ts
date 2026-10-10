import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * MDX DERLEME SEÇENEKLERİ — KANONİK TANIM. Başka kopyası YOK.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR — İKİ AŞAMADA OLUŞTU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. T-047'de Backend `mdx-validate.ts` içinde kaydetme öncesi bir derleme
 *    kapısı kurdu ve bu listeyi ZORUNLU OLARAK ÇİFTLEDİ, çünkü `mdx.tsx` onu
 *    ihraç etmiyordu. Çiftlenme tehlikesi somut: kapı `remark-gfm` olmadan
 *    derlerse GFM sözdizimi kapıda hata verip render'da çalışırdı (ya da
 *    tersi) — "kaydedilemeyen ama geçerli içerik" ya da "kaydedilen ama
 *    patlayan içerik" doğardı.
 *
 * 2. T-049f'te `mdx.tsx` listeyi ihraç etti ama bu YETMEDİ: Backend
 *    çiftlenmeyi kaldırmayı deneyince ÖLÇÜLEN bir duvara çarptı —
 *
 *      Failed to parse source for import analysis because the content
 *      contains invalid JS syntax … src/components/public/mdx.tsx
 *
 *    Vitest'in `unit` projesi `environment: 'node'` ve React eklentisi yok;
 *    bir `.tsx` modülünden içe aktarmak `mdx-validate.ts`'i ve onu içe aktaran
 *    dört eylemi HİÇ YÜKLETMİYOR. Üretim sınırı değil, test altyapısı sınırı —
 *    ama bağlayıcı.
 *
 * Çözüm JSX TAŞIMAYAN bir `.ts` modülü: hem `mdx.tsx` (render) hem
 * `mdx-validate.ts` (kaydetme kapısı) buradan okuyor. Backend yeni bir tanım
 * AÇMADI ve doğru yaptı — `src/lib/mdx-options.ts`'i kopya olarak açmak üçüncü
 * bir liste doğurur, hiçbiri kanonik olmazdı. Tanım TAŞINDI, çoğaltılmadı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SIRA ÖNEMLİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `rehype-sanitize` EN SONDA çalışır. Önce çalışsaydı, sonraki bir eklentinin
 * ürettiği düğümler denetimden geçmemiş olurdu. Şema açıkça veriliyor —
 * argümansız çağırmak da varsayılanı kullanır ama hangi şemanın yürürlükte
 * olduğu okunurken görünsün (§8.9; varsayılan şemanın neyi kapattığı
 * `mdx.tsx`in başında ölçümle yazılı).
 */

/*
  `as const` YOK ve olmamalı: `MDXRemote`/`compileMDX`in beklediği
  `SerializeOptions` DEĞİŞTİRİLEBİLİR dizi (`Pluggable[]`) istiyor, `readonly`
  olanı kabul etmiyor. `as const` eklemek derlemeyi kırıyordu — T-049f'te
  ölçüldü, Backend de aynı duvara karşı uyardı.
*/
export const MDX_OPTIONS: MDXRemoteProps['options'] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypeSanitize, defaultSchema]],
  },
};
