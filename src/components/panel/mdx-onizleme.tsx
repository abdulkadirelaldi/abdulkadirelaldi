'use client';

import { Mdx } from '@/components/public/mdx';

/**
 * ÖNİZLEME GÖVDESİ — public tarafın TAM OLARAK aynı bileşeni.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI DOSYA: TEMBEL YÜKLEMENİN SINIRI BURASI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `mdx-editor.tsx` bunu `next/dynamic` ile çağırıyor. Ayrı bir modül olmasının
 * tek sebebi bu: `Mdx`i editörün içine doğrudan koysaydım MDX derleyicisi
 * editörün yığınına girer ve yazma ekranı açılır açılmaz inerdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ AYRI RENDER YOLU YOK — ÖLÇÜLDÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Önizleme `@/components/public/mdx`ten geliyor; yani eklentiler (`remark-gfm`),
 * sanitize şeması (`defaultSchema`), başlık eşlemesi (`h1` → `h2`), href'siz
 * bağlantının düz metne inmesi — hepsi public tarafla BİREBİR aynı kod.
 *
 * "Önizlemede düzgündü" sınıfından bir hata için iki ayrı yol gerekir; burada
 * tek yol var. Bir gün `mdx.tsx` değişirse önizleme de aynı turda değişir,
 * çünkü değişecek başka bir yer yok.
 *
 * ÖLÇÜM (T-035): `Mdx` bir İSTEMCİ bileşeninin içinde render edilebiliyor mu
 * diye denendi — `MDXRemote` `next-mdx-remote/rsc`ten geliyor ve sunucuya özel
 * olması beklenirdi. Deneme sayfası 200 döndü, `h2` üretildi, konsol hatası
 * yoktu. Yani varsayım yanlıştı: bileşen paylaşılabiliyor. Bedeli aşağıda,
 * `mdx-editor.tsx`te yazılı.
 */
export default function MdxOnizleme({ kaynak }: { kaynak: string }) {
  if (!kaynak.trim()) {
    return (
      <p className="text-muted py-8 text-center text-sm">
        Önizlenecek bir şey yok — soldaki alana yazmaya başla.
      </p>
    );
  }

  return <Mdx kaynak={kaynak} className="max-w-none" />;
}
