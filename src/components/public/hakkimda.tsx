'use client';

import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { CountUp } from '@/components/reactbits/lazy';
import type { ProfileDto } from '@/server/services/content-dto';

export type Istatistik = {
  /** Sayılacak hedef. */
  deger: number;
  /** Sayının hemen ardına eklenen ek ("+", "%"). */
  sonek?: string;
  etiket: string;
};

export type HakkimdaProps = {
  /** ADR-026 sözleşmesi. `bio` boş satırla ayrılmış paragraflara bölünür. */
  profil: ProfileDto;
  /**
   * İstatistikler ŞU AN DTO'DA YOK — `ProfileDto` böyle bir alan taşımıyor ve
   * sayıların kaynağı henüz karara bağlanmadı (T-000 / ENGEL-3: `Profile.stats`
   * mı, `Project`/`Client` sayımından türetme mi). Karar çıkana kadar çağıran
   * taraf veriyor; DTO alanı gelince bu prop kalkar.
   */
  istatistikler: Istatistik[];
};

/**
 * "Hakkımda" bölümü — §4.1.
 *
 * İstatistikler `CountUp` ile gelir ve §5.1 gereği GÖRÜNÜR OLUNCA tetiklenir
 * (bileşenin kendi `useInView`'ı hallediyor). Sayılar §3.2 gereği `tabular`
 * ile hizalı; yan yana dururken rakam genişliği oynamaz.
 */
export function Hakkimda({ profil, istatistikler }: HakkimdaProps) {
  const paragraflar = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <section id="hakkimda" aria-labelledby="hakkimda-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-col gap-3">
          <p className="tabular text-accent-soft text-xs tracking-wider uppercase">02 — Hakkımda</p>
          <h2 id="hakkimda-baslik" className="text-3xl md:text-4xl">
            Kısaca ben
          </h2>
        </BolumGiris>

        <div className="mt-8 grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <BolumGiris gecikme={0.08} className="flex flex-col gap-4">
            {paragraflar.map((paragraf) => (
              <p key={paragraf.slice(0, 32)} className="text-body max-w-2xl">
                {paragraf}
              </p>
            ))}

            <Link
              href="/hakkimda"
              prefetch={false}
              className="focus-ring text-accent-soft rounded-btn self-start text-sm font-medium"
            >
              Daha fazlası →
            </Link>
          </BolumGiris>

          {istatistikler.length > 0 && (
            <BolumGiris gecikme={0.16}>
              <dl className="grid grid-cols-3 gap-4 md:grid-cols-1 md:gap-6">
                {istatistikler.map((istatistik) => (
                  <div
                    key={istatistik.etiket}
                    className="border-line bg-surface/60 rounded-card flex flex-col gap-1 border p-4"
                  >
                    <dt className="text-muted order-2 text-sm">{istatistik.etiket}</dt>
                    <dd className="tabular text-primary order-1 text-3xl font-medium">
                      <CountUp to={istatistik.deger} duration={1.4} />
                      {istatistik.sonek}
                    </dd>
                  </div>
                ))}
              </dl>
            </BolumGiris>
          )}
        </div>
      </div>
    </section>
  );
}
