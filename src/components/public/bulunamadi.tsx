import Link from 'next/link';

import { BirincilBaglanti, ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';

/**
 * 404 — ADR-045 dilinde. Hem `(public)/not-found.tsx` (sayfa içinden
 * `notFound()`) hem kök `not-found.tsx` (hiçbir rotaya uymayan adres) bunu
 * çiziyor; iki ayrı metin bakımı olmasın.
 *
 * Terminal satırı yazılımcı imzası: aranan yolun "dosya sistemi"nde olmadığını
 * söylüyor. Sayfanın tek `<h1>`i görünür başlık; dev "404" süs.
 */
export function Bulunamadi({ dil }: { dil: Dil }) {
  const s = sozluk(dil);
  const b = s.bulunamadi;
  return (
    <section className="flex min-h-[70dvh] items-center pt-28 pb-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 md:px-8">
        <p
          aria-hidden="true"
          className="text-accent text-7xl font-semibold tracking-tight md:text-8xl"
        >
          404
        </p>

        <h1 className="dev-baslik text-primary text-3xl md:text-4xl">{b.baslik}</h1>

        <p className="text-body max-w-xl">{b.aciklama}</p>

        <div className="flex flex-wrap gap-3">
          <BirincilBaglanti href={yol(dil, 'anasayfa')}>{s.sayfaAdi.anasayfa}</BirincilBaglanti>
          <Link href={yol(dil, 'projeler')} className={ikincilSiniflari('md')}>
            {s.sayfaAdi.projeler}
          </Link>
          <Link href={yol(dil, 'blog')} className={ikincilSiniflari('md')}>
            {s.sayfaAdi.blog}
          </Link>
        </div>
      </div>
    </section>
  );
}
