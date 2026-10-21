import { ArrowLeft, Code2, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { Mdx } from '@/components/public/mdx';
import { cipSiniflari, filtreAdresi } from '@/components/public/proje-filtre';
import { PROJE_SEMALARI } from '@/components/public/proje-semalari';
import { GradyanDisBaglanti, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { HarfHarf } from '@/components/public/tasarim/harf-harf';
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
  // Mimari şema — kodda, slug'la eşleşiyor (proje-semalari.tsx gerekçesi).
  const Sema = PROJE_SEMALARI[proje.slug];

  // Künye — "spec sheet": yalnızca DOLU alanlar satır üretir (T-022 kalıbı).
  const kunye = [
    proje.clientName && { ad: 'Müşteri', deger: proje.clientName },
    // ISO dizesinden yıl-ay — `Date` aritmetiği yok (ADR-016 mantığı).
    proje.publishedAt && { ad: 'Yayın', deger: proje.publishedAt.slice(0, 7) },
    proje.stack.length > 0 && { ad: 'Yığın', deger: proje.stack.join(' · ') },
  ].filter((k): k is { ad: string; deger: string } => Boolean(k));

  return (
    <article>
      <header className="relative isolate overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-8">
          <Link
            href="/projeler"
            className="focus-ring tabular text-muted hover:text-primary rounded-btn inline-flex w-fit items-center gap-2 text-xs transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            cd ../projeler
          </Link>

          {/* Sayfadaki TEK <h1>. MDX içindeki `#` başlıkları `<h2>` olarak çizilir. */}
          <h1 className="dev-baslik text-primary text-[clamp(2.25rem,7.5vw,7rem)]">
            <span className="sr-only">{proje.title}</span>
            <HarfHarf metin={proje.title} aralik={0.02} />
          </h1>

          <div className="animate-sayfa-giris grid gap-10 [animation-delay:0.3s] md:grid-cols-[1.3fr_1fr]">
            <p className="text-body text-lg leading-relaxed md:text-xl">{proje.summary}</p>

            <div className="flex flex-col gap-6">
              {kunye.length > 0 && (
                <dl className="border-line border-t">
                  {kunye.map((k) => (
                    <div
                      key={k.ad}
                      className="border-line grid grid-cols-[6rem_1fr] gap-4 border-b py-3 text-sm"
                    >
                      <dt className="tabular text-muted text-xs tracking-[0.14em] uppercase">
                        {k.ad}
                      </dt>
                      <dd className="text-primary">{k.deger}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {proje.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {proje.tags.map((etiket) => (
                    <li key={etiket}>
                      {/* Etiket, listeye SÜZÜLMÜŞ olarak döner — katalogda gezinme yolu. */}
                      <Link href={filtreAdresi({ etiket })} className={cipSiniflari(false)}>
                        {etiket}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {(proje.liveUrl || proje.repoUrl) && (
                <div className="flex flex-wrap gap-3">
                  {proje.liveUrl && (
                    <GradyanDisBaglanti href={proje.liveUrl}>Canlı site</GradyanDisBaglanti>
                  )}
                  {proje.repoUrl && (
                    <a
                      href={proje.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={hapSiniflari('h-11 px-5')}
                    >
                      <Code2 className="size-4" aria-hidden="true" />
                      Kaynak kodu
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-32 md:px-8">
        {/* Kapak: liste kartıyla AYNI bileşen (ADR-018 yer tutucusu dahil). */}
        <div className="overflow-hidden rounded-[2rem]">
          <KapakGorsel kapak={proje.cover} baslik={proje.title} />
        </div>

        {Sema && (
          <section aria-labelledby="mimari-baslik" className="flex flex-col gap-6">
            <h2
              id="mimari-baslik"
              className="dev-baslik text-primary text-[clamp(2rem,6vw,4.5rem)]"
            >
              Mimari
            </h2>
            <Sema />
          </section>
        )}

        {/* İçerik — problem / çözüm / sonuç anlatısı MDX'ten gelir (§8.9). */}
        <div className="mx-auto w-full max-w-3xl">
          <Mdx kaynak={proje.content} kayitEtiketi={`project:${proje.slug}`} />
        </div>

        {proje.gallery.length > 0 && (
          <section aria-labelledby="galeri-baslik" className="flex flex-col gap-8">
            <h2
              id="galeri-baslik"
              className="dev-baslik text-primary text-[clamp(2rem,6vw,4.5rem)]"
            >
              Görseller
            </h2>

            {/*
              Sıra servisten geliyor (`order` ile sıralı, ADR-018) — burada
              yeniden sıralanmıyor. Kapaklarla AYNI bileşen: ikinci bir görsel
              yolu açmak, görsel kaynağı değiştiğinde iki yerde birden düzeltme
              gerektirirdi — T-037f'te tek yerde bağlandı.
            */}
            <ul className="grid gap-4 sm:grid-cols-2">
              {proje.gallery.map((gorsel, sira) => (
                <li key={gorsel.id} className="overflow-hidden rounded-[1.5rem]">
                  <KapakGorsel kapak={gorsel} baslik={`${proje.title} — görsel ${sira + 1}`} />
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
        <aside className="panel-acik bg-canvas grid gap-8 rounded-[2rem] p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12">
          <div className="flex flex-col gap-3">
            <p className="dev-baslik text-primary text-3xl md:text-5xl">Benzer bir iş mi?</p>
            <p className="text-body max-w-xl text-sm">
              Ticari işler <span className="text-primary font-semibold">Kıyı Medya</span> üzerinden
              yürüyor; teklif ve sözleşme orada.
            </p>
          </div>
          <GradyanDisBaglanti href={KIYI_MEDYA_URL} data-cta="proje-detay" data-proje={proje.slug}>
            Kıyı Medya ile ilerle
          </GradyanDisBaglanti>
        </aside>
      </div>
    </article>
  );
}
