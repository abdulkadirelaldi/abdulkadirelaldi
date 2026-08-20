import { FilterX, PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { YaziKarti } from '@/components/public/yazi-karti';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils/cn';
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
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Blog</p>
        <h1 className="text-3xl md:text-5xl">Notlar</h1>
        <p className="text-body max-w-2xl text-lg">
          Yazılım, web performansı ve ürün geliştirme üzerine yazdıklarım. Çoğu, bir işi yaparken
          not aldığım şeyler.
        </p>
      </header>

      {etiketler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted w-20 shrink-0 text-xs tracking-wider uppercase">Etiket</span>

          {[undefined, ...etiketler].map((secenek) => {
            const secili = etiket === secenek;
            return (
              <Link
                key={secenek ?? 'tumu'}
                href={etiketAdresi(secenek)}
                aria-current={secili ? 'true' : undefined}
                className={cn(
                  'focus-ring rounded-pill ease-brand duration-micro border px-3 py-1.5 text-sm transition-colors',
                  secili
                    ? 'bg-accent/15 text-accent-soft border-accent/40 font-medium'
                    : 'border-line text-body hover:border-line-hover hover:text-primary',
                )}
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
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm">
            <span className="tabular">{yazilar.length}</span> yazı
            {etiket && ' (süzülmüş)'}
          </p>

          <ul>
            {yazilar.map((yazi) => (
              <li key={yazi.id}>
                <YaziKarti yazi={yazi} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
