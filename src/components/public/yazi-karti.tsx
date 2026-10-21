import { ArrowUpRight, Clock } from 'lucide-react';
import Link from 'next/link';

import { tamGun } from '@/components/public/gun-bicim';
import { Badge } from '@/components/ui/badge';
import type { PostListItemDto } from '@/server/services/content-dto';

/**
 * Yazı kartı — /blog listesi.
 *
 * KAPAK YOK: `PostListItemDto` kapak taşıyor ama liste görünümünde
 * kullanılmıyor. Bir blog listesinde okuyucunun aradığı şey başlık ve özet;
 * her satıra 16/10'luk bir yer tutucu koymak (ADR-018 gereği hepsi bugün boş)
 * listeyi üç katına uzatır ve hiçbir bilgi vermezdi. Kapak, T-037 imzalı
 * URL'leri getirdiğinde değerlendirilecek bir karar.
 *
 * `baslikEtiketi` PROP: T-024'ün dersi — başlık seviyesi içeriğin değil
 * KONUMUN işlevi. Listede kartların üstünde ara başlık yok, doğru seviye `h2`.
 */
export function YaziKarti({
  yazi,
  baslikEtiketi: Baslik = 'h2',
}: {
  yazi: PostListItemDto;
  baslikEtiketi?: 'h2' | 'h3';
}) {
  return (
    <article className="border-line group relative grid gap-x-8 gap-y-3 border-b py-8 md:grid-cols-[11rem_1fr_auto] md:items-start">
      {/* ADR-045 — satır dili: solda tarih/süre (mono), ortada başlık + özet, sağda ok. */}
      <div className="tabular text-muted flex gap-4 text-xs md:flex-col md:gap-1">
        {yazi.publishedAt && (
          <time dateTime={yazi.publishedAt.slice(0, 10)}>{tamGun(yazi.publishedAt)}</time>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          {/* Sayı `tabular`: yan yana satırlarda rakam genişliği oynamasın (§3.2). */}
          <span>{yazi.readingMinutes}</span> dk okuma
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Baslik className="font-display text-2xl leading-tight font-bold md:text-3xl">
          {/* Bağlantının `::after`'ı satırın tamamını tıklanabilir yapıyor; erişilebilir
              ad yalnızca başlık (kartı saran bir <a> tüm metni ada katardı). */}
          <Link
            href={`/blog/${yazi.slug}`}
            className="focus-ring rounded-btn group-hover:text-accent-soft ease-brand transition-colors duration-300 after:absolute after:inset-0"
          >
            {yazi.title}
          </Link>
        </Baslik>
        <p className="text-body max-w-2xl text-sm leading-relaxed">{yazi.excerpt}</p>
        {yazi.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {yazi.tags.map((etiket) => (
              <li key={etiket}>
                <Badge variant="outline">{etiket}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span
        aria-hidden="true"
        className="border-line-strong text-primary ease-brand hidden size-12 items-center justify-center rounded-full border transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-base)] md:flex"
      >
        <ArrowUpRight className="size-5" />
      </span>
    </article>
  );
}
