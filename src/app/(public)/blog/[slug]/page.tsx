import { ArrowLeft, Clock, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { tamGun } from '@/components/public/gun-bicim';
import { Icindekiler } from '@/components/public/icindekiler';
import { Mdx } from '@/components/public/mdx';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { getPostBySlug } from '@/server/services';

type SayfaProps = { params: Promise<{ slug: string }> };

/**
 * OG GÖRSELİ: T-028'in `/og/<tur>/<slug>` rotası. Yazı için tür `yazi`.
 * Adres göreli veriliyor; `metadataBase` kök layout'ta/T-028'de mutlak adrese
 * çeviriyor, aynı değeri iki yerde tutmuyoruz.
 *
 * ARŞİV: `GONE` durumunda `noindex, nofollow`. ADR-019 revize edildi — Next
 * 15.5'te Sunucu Bileşeni durum kodu belirleyemiyor (T-024 teşhisi) ve
 * middleware'de Prisma çalışmıyor (T-014/K1); dizinden çıkma sinyalini
 * `noindex` veriyor.
 *
 * ⚠️ BİLİNEN DAVRANIŞ — AKIŞLI METADATA (T-025 ölçümü, ENGEL olarak raporlandı)
 * `generateMetadata` sayfa gövdesiyle YARIŞIYOR. `Mdx` (asenkron sunucu
 * bileşeni) kabuğun erken boşaltılmasına yol açtığı için metadata çoğu istekte
 * geç kalıyor ve Next onu `<head>` yerine gövdenin sonuna yazıyor; React
 * istemcide head'e taşıyor.
 *
 *   Twitterbot / Slackbot / facebookexternalhit …  → `<head>` İÇİNDE (ölçüldü)
 *   Googlebot ve tarayıcılar (Lighthouse dahil)    → gövdede (ölçüldü)
 *
 * Next bunu bilerek yapıyor: `HTML_LIMITED_BOT_UA_RE` listesindeki, JS
 * çalıştırmayan istemcilerde akış engelleniyor. Lighthouse'un mobil UA'sı bu
 * listede olmadığı için `meta-description` denetimi düşüyor (SEO 91).
 * TEK ÇÖZÜM `next.config.ts` → `experimental.htmlLimitedBots`; o dosya ortak
 * (§10.1), bu yüzden sayfa tarafında bir şey uydurulmadı.
 */
export async function generateMetadata({ params }: SayfaProps): Promise<Metadata> {
  const { slug } = await params;
  const sonuc = await getPostBySlug(slug);

  if (sonuc.state === 'GONE') {
    return { title: 'Kaldırıldı', robots: { index: false, follow: false } };
  }
  if (sonuc.state === 'NOT_FOUND') {
    return { title: 'Bulunamadı' };
  }

  const yazi = sonuc.data;
  return {
    title: yazi.title,
    description: yazi.excerpt,
    openGraph: {
      type: 'article',
      title: yazi.title,
      description: yazi.excerpt,
      images: [{ url: `/og/yazi/${yazi.slug}` }],
      ...(yazi.publishedAt ? { publishedTime: yazi.publishedAt } : {}),
    },
  };
}

/**
 * /blog/[slug] — §4.1 yazı detayı.
 *
 * MDX KALIBI DEVRALINDI, KOPYALANMADI: `Mdx` bileşeni T-024'te proje detayı
 * için yazılmıştı ve buraya tek satırla giriyor. Sanitize şeması, eklenti
 * sırası ve tipografi orada; bu dosyada MDX'e dair tek bir yapılandırma yok.
 *
 * DURUMLAR (ADR-019, revize): NOT_FOUND → 404 (servis `DRAFT` ve zamanı
 * gelmemiş `SCHEDULED` kayıtları da buraya indiriyor), GONE → 200 + `noindex`
 * + açık "kaldırıldı" ekranı.
 */
export default async function YaziSayfasi({ params }: SayfaProps) {
  const { slug } = await params;
  const sonuc = await getPostBySlug(slug);

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

        <h1 className="text-3xl md:text-4xl">Bu yazı kaldırıldı</h1>

        <p className="text-muted">
          Bu adres bir zamanlar bir yazıya çıkıyordu ama içerik kalıcı olarak kaldırıldı. Adres
          doğru — dönecek bir şey yok.
        </p>

        <Link href="/blog" className={buttonClasses({ className: 'mt-2' })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Tüm yazılar
        </Link>
      </div>
    );
  }

  const yazi = sonuc.data;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <Link
          href="/blog"
          className="focus-ring text-muted hover:text-primary rounded-btn inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Blog
        </Link>

        {/* Sayfadaki TEK <h1>. MDX'teki `#` başlıklar `<h2>` olarak çizilir. */}
        <h1 className="text-3xl md:text-5xl">{yazi.title}</h1>

        <p className="text-body max-w-2xl text-lg">{yazi.excerpt}</p>

        <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {yazi.publishedAt && (
            <time className="tabular" dateTime={yazi.publishedAt.slice(0, 10)}>
              {tamGun(yazi.publishedAt)}
            </time>
          )}

          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" />
            <span className="tabular">{yazi.readingMinutes}</span> dk okuma
          </span>

          {yazi.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {yazi.tags.map((etiket) => (
                <li key={etiket}>
                  {/* Etiket, listeye süzülmüş olarak döner — T-024'teki kalıp. */}
                  <Link
                    href={`/blog?etiket=${encodeURIComponent(etiket)}`}
                    className="focus-ring rounded-pill"
                  >
                    <Badge variant="accent">{etiket}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {/*
        İÇİNDEKİLER İÇERİKTEN ÖNCE ve `<nav>`: klavyeyle gelen okuyucu, yazının
        tamamını geçmeden bölümlere atlayabilsin. İki başlıktan az varsa bileşen
        kendini hiç render etmiyor.
      */}
      <Icindekiler kaynak={yazi.content} />

      <Mdx kaynak={yazi.content} className="max-w-none" />
    </article>
  );
}
