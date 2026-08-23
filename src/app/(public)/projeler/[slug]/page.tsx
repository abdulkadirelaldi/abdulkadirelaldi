import { ArrowLeft, ArrowUpRight, Code2, Globe, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { Mdx } from '@/components/public/mdx';
import { filtreAdresi } from '@/components/public/proje-filtre';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { getProjectBySlug } from '@/server/services';

/** §12 — adres koda gömülmez. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

type SayfaProps = { params: Promise<{ slug: string }> };

/**
 * ARAMA MOTORU SİNYALİ — ADR-019.
 *
 * `GONE` durumunda sayfa `noindex` alır: içerik kalıcı olarak kaldırıldı, dizine
 * girmemeli. `NOT_FOUND` zaten `notFound()` ile 404 döndüğü için buraya düşmez.
 */
export async function generateMetadata({ params }: SayfaProps): Promise<Metadata> {
  const { slug } = await params;
  const sonuc = await getProjectBySlug(slug);

  if (sonuc.state === 'GONE') {
    return { title: 'Kaldırıldı', robots: { index: false, follow: false } };
  }
  if (sonuc.state === 'NOT_FOUND') {
    return { title: 'Bulunamadı' };
  }

  return {
    title: sonuc.data.title,
    description: sonuc.data.summary,
  };
}

/**
 * /projeler/[slug] — §4.1 proje detayı.
 *
 * ÜÇ DURUM, ÜÇÜ DE AYRI (ADR-019):
 *
 *   FOUND     → sayfa
 *   NOT_FOUND → `notFound()` → 404. Servis, `DRAFT` ve zamanı gelmemiş
 *               `SCHEDULED` kayıtları da bu duruma indiriyor; yani taslak ve
 *               ileri tarihli içerik public'te "hiç yok" gibi davranıyor.
 *   GONE      → "kaldırıldı" ekranı + `noindex`
 *
 * ⚠️ 410 DÖNDÜRÜLEMİYOR — Next 15.5 sınırı, raporda ENGEL olarak yazılı.
 * `next/navigation` yalnızca 404/403/401 için kesme sağlıyor
 * (`http-access-fallback`: `getAccessFallbackErrorTypeByStatus` 410'u
 * tanımıyor); bir Sunucu Bileşeni yanıt durumunu başka türlü belirleyemiyor.
 * Bu yüzden GONE bugün 200 + `noindex` + açık bir "kaldırıldı" ekranı olarak
 * uygulanıyor: kullanıcıya doğru şeyi söylüyor ve arama motoruna dizinden
 * çıkma sinyalini veriyor. Gerçek 410 için middleware gerekiyor ve middleware
 * hangi slug'ların ARCHIVED olduğunu bilmiyor — çözüm önerisi raporda.
 */
export default async function ProjeDetaySayfasi({ params }: SayfaProps) {
  const { slug } = await params;
  const sonuc = await getProjectBySlug(slug);

  if (sonuc.state === 'NOT_FOUND') notFound();

  if (sonuc.state === 'GONE') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-24">
        <span
          aria-hidden="true"
          className="bg-elevated text-muted rounded-pill flex size-12 items-center justify-center"
        >
          <Trash2 className="size-6" />
        </span>

        <h1 className="text-3xl md:text-4xl">Bu proje kaldırıldı</h1>

        <p className="text-muted">
          Bu sayfa bir zamanlar vardı ama içerik kalıcı olarak kaldırıldı. Adres doğru — dönecek bir
          şey yok.
        </p>

        <Link href="/projeler" className={buttonClasses({ className: 'mt-2' })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Tüm projeler
        </Link>
      </div>
    );
  }

  const proje = sonuc.data;

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <Link
          href="/projeler"
          className="focus-ring text-muted hover:text-primary rounded-btn inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Projeler
        </Link>

        {/* Sayfadaki TEK <h1>. MDX içindeki `#` başlıkları `<h2>` olarak çizilir. */}
        <h1 className="text-3xl md:text-5xl">{proje.title}</h1>

        <p className="text-body max-w-2xl text-lg">{proje.summary}</p>

        <dl className="text-muted flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {proje.clientName && (
            <div className="flex gap-2">
              <dt>Müşteri:</dt>
              <dd className="text-body">{proje.clientName}</dd>
            </div>
          )}
          {proje.publishedAt && (
            <div className="flex gap-2">
              <dt>Yayın:</dt>
              <dd className="tabular text-body">
                {/* ISO dizesinden yıl-ay — `Date` aritmetiği yok (ADR-016 mantığı). */}
                {proje.publishedAt.slice(0, 7)}
              </dd>
            </div>
          )}
        </dl>

        {(proje.tags.length > 0 || proje.stack.length > 0) && (
          <div className="flex flex-col gap-3">
            {proje.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {proje.tags.map((etiket) => (
                  <li key={etiket}>
                    {/* Etiket, listeye SÜZÜLMÜŞ olarak döner — katalogda gezinme yolu. */}
                    <Link href={filtreAdresi({ etiket })} className="focus-ring rounded-pill">
                      <Badge variant="accent">{etiket}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {proje.stack.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {proje.stack.map((teknoloji) => (
                  <li key={teknoloji}>
                    <Link href={filtreAdresi({ teknoloji })} className="focus-ring rounded-pill">
                      <Badge variant="outline">{teknoloji}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(proje.liveUrl || proje.repoUrl) && (
          <div className="flex flex-wrap gap-3">
            {proje.liveUrl && (
              <a
                href={proje.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <Globe className="size-4" aria-hidden="true" />
                Canlı site
              </a>
            )}
            {proje.repoUrl && (
              <a
                href={proje.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <Code2 className="size-4" aria-hidden="true" />
                Kaynak kodu
              </a>
            )}
          </div>
        )}
      </header>

      {/* Kapak: liste kartıyla AYNI bileşen (ADR-018 yer tutucusu dahil). */}
      <KapakGorsel kapak={proje.cover} baslik={proje.title} className="rounded-card" />

      {/* İçerik — problem / çözüm / sonuç anlatısı MDX'ten gelir (§8.9). */}
      <Mdx kaynak={proje.content} />

      {proje.gallery.length > 0 && (
        <section aria-labelledby="galeri-baslik" className="flex flex-col gap-4">
          <h2 id="galeri-baslik" className="text-2xl">
            Görseller
          </h2>

          {/*
            Sıra servisten geliyor (`order` ile sıralı, ADR-018) — burada
            yeniden sıralanmıyor. Kapaklarla AYNI bileşen kullanılıyor:
            ikinci bir görsel yolu açmak, T-037 imzalı URL'leri getirdiğinde
            iki yerde birden düzeltme gerektirirdi.
          */}
          <ul className="grid gap-4 sm:grid-cols-2">
            {proje.gallery.map((gorsel, sira) => (
              <li key={gorsel.id}>
                <KapakGorsel
                  kapak={gorsel}
                  baslik={`${proje.title} — görsel ${sira + 1}`}
                  className="rounded-card"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        KIYI MEDYA CTA — §1.1 K4, T-022'deki ölçülebilir kalıbın aynısı.
        `data-cta` + `data-proje`: analitik bağlandığında (F6) HANGİ projenin
        dönüştürdüğü ayırt edilebilsin. Sonradan eklemek zor, şimdi ücretsiz.
      */}
      <aside className="border-line bg-surface/60 rounded-card flex flex-wrap items-center justify-between gap-4 border p-6">
        <p className="text-body max-w-xl text-sm">
          Benzer bir iş mi düşünüyorsun? Ticari işler{' '}
          <span className="text-primary font-medium">Kıyı Medya</span> üzerinden yürüyor; teklif ve
          sözleşme orada.
        </p>

        <a
          href={KIYI_MEDYA_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="proje-detay"
          data-proje={proje.slug}
          className={buttonClasses({ className: 'shrink-0' })}
        >
          Kıyı Medya ile ilerle
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </aside>
    </article>
  );
}
