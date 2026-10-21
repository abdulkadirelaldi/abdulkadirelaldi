import { FilterX, PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { cipSiniflari } from '@/components/public/proje-filtre';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { ParlakGlif } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { YaziKarti } from '@/components/public/yazi-karti';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getFilteredPosts, getPublishedPosts } from '@/server/services';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Yazılım, web performansı ve ürün geliştirme üzerine notlar. Etikete göre süzebilirsin.',
};

/** Tek değerli parametre okuma — dizi gelirse ilki geçerli (T-024 ile aynı kural). */
function tekDeger(deger: string | string[] | undefined): string | undefined {
  if (Array.isArray(deger)) return deger[0];
  return deger;
}

/**
 * Etiket adresi — T-024'ün `/projeler?etiket=` şemasıyla TUTARLI.
 *
 * Ayrı bir yardımcı: `filtreAdresi` projelere ait ve `/projeler` yolunu
 * sabitliyor. İkisini tek fonksiyona bağlamak yol parametresi eklemeyi
 * gerektirirdi; iki satırlık iki fonksiyon, bir "genelleştirilmiş" fonksiyondan
 * okunaklı. ŞEMA ise bilinçli olarak aynı: `?etiket=<tag>`.
 */
function etiketAdresi(etiket?: string): string {
  return etiket ? `/blog?etiket=${encodeURIComponent(etiket)}` : '/blog';
}

/**
 * /blog — §4.1 liste + etiket filtresi.
 *
 * SUNUCU BİLEŞENİ, istemci bileşeni yok: filtre `<Link>`lerden ibaret, durum
 * URL'de (T-024'teki gerekçenin aynısı — paylaşılabilir bağlantı, çalışan
 * geri/ileri, sıfır istemci JS).
 *
 * İKİ OKUMA, TEK VERİTABANI İSTEĞİ: `getPublishedPosts` önbellekli tam listeyi
 * verir, `getFilteredPosts` AYNI girdiyi bellekte süzer (ADR-032). Etiket
 * seçenekleri TAM listeden türetiliyor — süzülmüş listeden türetilseydi bir
 * etiket seçildiğinde diğerleri kaybolur, ikinci seçim imkânsızlaşırdı (T-024).
 */
export default async function BlogSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const etiket = tekDeger(parametreler.etiket);

  const [tumYazilar, yazilar] = await Promise.all([
    getPublishedPosts(),
    getFilteredPosts({ tag: etiket }),
  ]);

  const etiketler = [...new Set(tumYazilar.flatMap((y) => y.tags))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );

  return (
    <>
      <SayfaBasligi
        baslik="Blog"
        yol="~/blog"
        aciklama="Yazılım, web performansı ve ürün geliştirme üzerine yazdıklarım. Çoğu, bir işi yaparken not aldığım şeyler."
        ek={
          yazilar.length > 0 && (
            <p className="tabular text-muted text-xs">
              <span className="text-primary">{yazilar.length}</span> yazı
              {etiket && ' (süzülmüş)'}
            </p>
          )
        }
        susler={
          <Yuzen hiz={-120} className="top-28 right-[8%] w-20 md:w-32">
            <ParlakGlif glif="/*" className="text-[5rem] md:text-[8rem]" />
          </Yuzen>
        }
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-32 md:px-8">
        {etiketler.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular text-muted w-24 shrink-0 text-xs">
              <span aria-hidden="true">--</span>etiket
            </span>

            {[undefined, ...etiketler].map((secenek) => {
              const secili = etiket === secenek;
              return (
                <Link
                  key={secenek ?? 'tumu'}
                  href={etiketAdresi(secenek)}
                  aria-current={secili ? 'true' : undefined}
                  className={cipSiniflari(secili)}
                >
                  {secenek ?? 'Tümü'}
                </Link>
              );
            })}
          </div>
        )}

        {yazilar.length === 0 ? (
          /*
          İki boş durum, iki sebep (T-024 ile aynı ayrım). Bilinmeyen etiket
          BİRİNCİYE düşer ve 404 DÖNDÜRMEZ — boş filtre sonucu "yok olmuş
          içerik" değildir.
        */
          etiket ? (
            <EmptyState
              icon={FilterX}
              title="Bu etikette yazı yok"
              description="Seçtiğin etiketle eşleşen bir yazı bulunmuyor. Etiketi kaldırıp tümüne bakabilirsin."
              action={
                <Link href={etiketAdresi()} className={buttonClasses({ size: 'sm' })}>
                  Tüm yazılar
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={PenLine}
              title="İlk yazı yolda"
              description="Buraya yazılım ve ürün geliştirme notlarımı yazacağım. Bu arada projelere göz atabilirsin."
              action={
                <Link href="/projeler" className={buttonClasses({ size: 'sm' })}>
                  Projelere bak
                </Link>
              }
            />
          )
        ) : (
          <ul className="border-line border-t">
            {yazilar.map((yazi) => (
              <li key={yazi.id}>
                <YaziKarti yazi={yazi} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
