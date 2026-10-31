import { ChevronLeft, ChevronRight, Dumbbell, Scale, Sparkles, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { gunAy } from '@/components/panel/hayat-bicim';
import { paraBicim } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { cn } from '@/lib/utils/cn';
import { addAppDays, appToday, startOfAppWeek } from '@/server/services/_shared';
import { fetchHaftalikOzet } from '@/server/services/haftalik-ozet';

export const metadata: Metadata = {
  title: 'Haftalık özet',
  robots: { index: false, follow: false, nocache: true },
};

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function gecerliGun(ham: unknown): string | null {
  if (typeof ham !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ham)) return null;
  const tarih = new Date(`${ham}T00:00:00Z`);
  return !Number.isNaN(tarih.getTime()) && tarih.toISOString().slice(0, 10) === ham ? ham : null;
}

const sayi = (n: number) => n.toLocaleString('tr-TR');

/** `/panel/haftalik` — alışkanlık, spor, harcama ve kilo tek ekranda (2026-11-01). */
export default async function HaftalikPage({ searchParams }: SayfaProps) {
  const istenen = gecerliGun((await searchParams).hafta);
  const buHafta = startOfAppWeek(appToday());
  const hafta = istenen && startOfAppWeek(istenen) < buHafta ? startOfAppWeek(istenen) : buHafta;

  const o = await fetchHaftalikOzet(hafta);
  const sonraki = hafta < buHafta ? addAppDays(hafta, 7) : null;

  const harcamaFark = Number(o.harcama.tl) - Number(o.harcama.oncekiTl);
  const hacimFark = o.spor.hacimKg - o.spor.oncekiHacimKg;
  const yuzdeFark =
    o.aliskanlik.yuzde !== null && o.aliskanlik.oncekiYuzde !== null
      ? o.aliskanlik.yuzde - o.aliskanlik.oncekiYuzde
      : null;
  const kiloFark = o.kilo.fark === null ? null : Number(o.kilo.fark);

  return (
    <>
      <Topbar title="Haftalık özet" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <nav aria-label="Hafta seçimi" className="flex items-center justify-between">
            <HaftaDugmesi
              href={`/panel/haftalik?hafta=${addAppDays(hafta, -7)}`}
              etiket="Önceki hafta"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </HaftaDugmesi>
            <h2 className="text-primary text-base font-semibold">
              {gunAy(o.bas)} – {gunAy(o.son)}
            </h2>
            {sonraki ? (
              <HaftaDugmesi href={`/panel/haftalik?hafta=${sonraki}`} etiket="Sonraki hafta">
                <ChevronRight className="size-5" aria-hidden="true" />
              </HaftaDugmesi>
            ) : (
              <span className="size-10" aria-hidden="true" />
            )}
          </nav>

          <Kart
            href="/panel/hayat"
            ikon={<Sparkles className="size-4" aria-hidden="true" />}
            renk="from-violet-500 to-purple-500"
            baslik="Alışkanlık"
            deger={o.aliskanlik.yuzde === null ? '—' : `%${o.aliskanlik.yuzde}`}
            alt={
              yuzdeFark === null
                ? null
                : `Geçen haftaya göre ${yuzdeFark > 0 ? '+' : ''}${yuzdeFark} puan`
            }
          >
            {o.aliskanlik.adet > 0 && (
              <ol className="mt-1 grid grid-cols-7 gap-1.5">
                {o.aliskanlik.gunler.map((oran, i) => (
                  <li
                    key={GUNLER[i]}
                    aria-label={`${GUNLER[i]}: %${Math.round(oran * 100)}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="bg-elevated flex h-14 w-full items-end overflow-hidden rounded-md">
                      {oran > 0 && (
                        <span
                          className="w-full rounded-md bg-violet-500"
                          style={{ height: `${Math.max(8, oran * 100)}%` }}
                        />
                      )}
                    </span>
                    <span className="text-muted text-[10px]">{GUNLER[i]}</span>
                  </li>
                ))}
              </ol>
            )}
          </Kart>

          <div className="grid gap-3 sm:grid-cols-3">
            <Kart
              href="/panel/spor/gelisim"
              ikon={<Dumbbell className="size-4" aria-hidden="true" />}
              renk="from-orange-500 to-amber-500"
              baslik="Spor"
              deger={`${o.spor.antrenman} antrenman`}
              alt={
                o.spor.hacimKg > 0 || o.spor.oncekiHacimKg > 0
                  ? `${sayi(o.spor.hacimKg)} kg hacim · ${hacimFark >= 0 ? '+' : ''}${sayi(hacimFark)}`
                  : null
              }
            />
            <Kart
              href="/panel/cuzdan/rapor"
              ikon={<Wallet className="size-4" aria-hidden="true" />}
              renk="from-emerald-500 to-teal-500"
              baslik="Harcama"
              deger={paraBicim(o.harcama.tl, 'TRY')}
              alt={
                Number(o.harcama.oncekiTl) > 0 || Number(o.harcama.tl) > 0
                  ? `Geçen hafta ${paraBicim(o.harcama.oncekiTl, 'TRY')}${hafta === buHafta || harcamaFark === 0 ? '' : harcamaFark > 0 ? ' · arttı' : ' · azaldı'}`
                  : 'Düzenli ödemeler hariç'
              }
            />
            <Kart
              href="/panel/saglik"
              ikon={<Scale className="size-4" aria-hidden="true" />}
              renk="from-rose-500 to-pink-500"
              baslik="Kilo"
              deger={o.kilo.son ? `${o.kilo.son.replace('.', ',')} kg` : '—'}
              alt={
                kiloFark === null
                  ? o.kilo.son
                    ? null
                    : 'Bu hafta tartı yok'
                  : `Geçen haftaya göre ${kiloFark > 0 ? '+' : ''}${String(kiloFark).replace('.', ',')} kg`
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}

function Kart({
  href,
  ikon,
  renk,
  baslik,
  deger,
  alt,
  children,
}: {
  href: string;
  ikon: ReactNode;
  renk: string;
  baslik: string;
  deger: string;
  alt: string | null;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-card border-line bg-surface flex min-w-0 flex-col gap-1.5 border p-4"
    >
      <span className="text-muted flex items-center gap-2 text-sm">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-lg bg-gradient-to-br text-white',
            renk,
          )}
        >
          {ikon}
        </span>
        {baslik}
      </span>
      <span className="tabular text-primary truncate text-2xl font-semibold tracking-tight">
        {deger}
      </span>
      {alt && <span className="text-muted text-xs">{alt}</span>}
      {children}
    </Link>
  );
}

function HaftaDugmesi({
  href,
  etiket,
  children,
}: {
  href: string;
  etiket: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={etiket}
      className="focus-ring bg-surface text-body flex size-10 items-center justify-center rounded-full shadow-[var(--golge-kart)]"
    >
      {children}
    </Link>
  );
}
