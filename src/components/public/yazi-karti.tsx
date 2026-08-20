import { Clock } from 'lucide-react';
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
    <article className="border-line flex flex-col gap-2 border-b py-6 first:pt-0 last:border-b-0">
      <Baslik className="text-xl">
        <Link
          href={`/blog/${yazi.slug}`}
          className="focus-ring hover:text-accent-soft ease-brand duration-micro rounded-btn transition-colors"
        >
          {yazi.title}
        </Link>
      </Baslik>

      <p className="text-muted max-w-2xl text-sm">{yazi.excerpt}</p>

      <div className="text-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {yazi.publishedAt && (
          <time className="tabular" dateTime={yazi.publishedAt.slice(0, 10)}>
            {tamGun(yazi.publishedAt)}
          </time>
        )}

        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          {/* Sayı `tabular`: yan yana kartlarda rakam genişliği oynamasın (§3.2). */}
          <span className="tabular">{yazi.readingMinutes}</span> dk okuma
        </span>

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
    </article>
  );
}
