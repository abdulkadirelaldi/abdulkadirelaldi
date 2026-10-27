import { FilterX, PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { cipSiniflari } from '@/components/public/proje-filtre';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { YaziKarti } from '@/components/public/yazi-karti';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol, yolSorgulu } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { getFilteredPosts, getPublishedPosts } from '@/server/services';

export function blogMetadata(dil: Dil): Metadata {
  const m = sozluk(dil).sayfaBaslik.blog;
  return { title: m.baslik, description: m.metaAciklama, ...dilAlternatifleri(dil, 'blog') };
}

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
function etiketAdresi(dil: Dil, etiket?: string): string {
  return yolSorgulu(dil, 'blog', { etiket });
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
export async function BlogSayfasi({
  dil,
  searchParams,
}: {
  dil: Dil;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = sozluk(dil);
  const parametreler = await searchParams;
  const etiket = tekDeger(parametreler.etiket);

  const [tumYazilar, yazilar] = await Promise.all([
    getPublishedPosts(dil),
    getFilteredPosts({ tag: etiket }, dil),
  ]);

  const etiketler = [...new Set(tumYazilar.flatMap((y) => y.tags))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );

  return (
    <>
      <SayfaBasligi
        baslik={s.sayfaBaslik.blog.baslik}
        aciklama={s.sayfaBaslik.blog.aciklama}
        ek={
          yazilar.length > 0 && (
            <p className="tabular text-muted text-xs">
              {s.liste.yaziSayisi(yazilar.length, Boolean(etiket))}
            </p>
          )
        }
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-32 md:px-8">
        {etiketler.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-primary w-24 shrink-0 text-sm font-medium">{s.liste.etiket}</span>

            {[undefined, ...etiketler].map((secenek) => {
              const secili = etiket === secenek;
              return (
                <Link
                  key={secenek ?? 'tumu'}
                  href={etiketAdresi(dil, secenek)}
                  aria-current={secili ? 'true' : undefined}
                  className={cipSiniflari(secili)}
                >
                  {secenek ?? s.liste.tumu}
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
              title={s.liste.bosSuzgecYazi}
              description={s.liste.bosSuzgecYaziAciklama}
              action={
                <Link href={etiketAdresi(dil)} className={buttonClasses({ size: 'sm' })}>
                  {s.liste.tumYazilar}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={PenLine}
              title={s.liste.bosYazi}
              description={s.liste.bosYaziAciklama}
              action={
                <Link href={yol(dil, 'projeler')} className={buttonClasses({ size: 'sm' })}>
                  {s.liste.projelereBak}
                </Link>
              }
            />
          )
        ) : (
          <ul className="border-line border-t">
            {yazilar.map((yazi) => (
              <li key={yazi.id}>
                <YaziKarti dil={dil} yazi={yazi} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
