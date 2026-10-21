import Link from 'next/link';

import { GradyanBaglanti, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { ParlakGlif, ParlakHalka } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';

/**
 * 404 — ADR-045 dilinde. Hem `(public)/not-found.tsx` (sayfa içinden
 * `notFound()`) hem kök `not-found.tsx` (hiçbir rotaya uymayan adres) bunu
 * çiziyor; iki ayrı metin bakımı olmasın.
 *
 * Terminal satırı yazılımcı imzası: aranan yolun "dosya sistemi"nde olmadığını
 * söylüyor. Sayfanın tek `<h1>`i görünür başlık; dev "404" süs.
 */
export function Bulunamadi() {
  return (
    <section className="relative isolate flex min-h-[80dvh] items-center overflow-hidden pt-28 pb-20">
      <Yuzen hiz={-100} className="top-[38%] right-[8%] hidden w-24 md:block">
        <ParlakHalka className="w-full" />
      </Yuzen>
      <Yuzen hiz={-60} gecikme={0.8} className="right-[22%] bottom-16 hidden md:block">
        <ParlakGlif glif="?" className="text-[7rem]" />
      </Yuzen>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 md:px-8">
        <p
          aria-hidden="true"
          className="dev-baslik metin-kontur text-[clamp(6rem,26vw,22rem)] leading-[0.8]"
        >
          404
        </p>

        <h1 className="dev-baslik text-primary text-[clamp(2rem,6vw,4.5rem)]">
          Bu yol bir yere çıkmıyor
        </h1>

        <pre className="tabular bg-surface border-line text-muted w-fit max-w-full overflow-x-auto rounded-[1rem] border px-5 py-4 text-xs leading-relaxed">
          <code>
            <span className="text-accent-soft">abdulkadir@site</span>:~$ cd aradığın-sayfa{'\n'}
            <span className="text-danger">bash: cd: böyle bir dosya ya da dizin yok</span>
          </code>
        </pre>

        <p className="text-body max-w-xl">
          Adres yanlış yazılmış ya da sayfa taşınmış olabilir. Aşağıdakilerden biriyle devam
          edebilirsin.
        </p>

        <div className="flex flex-wrap gap-3">
          <GradyanBaglanti href="/">Ana sayfa</GradyanBaglanti>
          <Link href="/projeler" className={hapSiniflari('h-11 px-5')}>
            Projeler
          </Link>
          <Link href="/blog" className={hapSiniflari('h-11 px-5')}>
            Blog
          </Link>
        </div>
      </div>
    </section>
  );
}
