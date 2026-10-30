import {
  CalendarClock,
  ChevronRight,
  Dumbbell,
  Mail,
  Play,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { paraBicim } from '@/components/panel/para-bicim';
import { BaslatDugmesi } from '@/components/panel/spor-dugmeleri';
import { Topbar } from '@/components/panel/topbar';
import { SU_HEDEFI_ML } from '@/lib/hedefler';
import { cn } from '@/lib/utils/cn';
import { addAppDays, appToday, type AppDay } from '@/server/services/_shared';
import {
  fetchActiveSession,
  fetchProgram,
  fetchRecentSessions,
} from '@/server/services/antrenman-oturumu';
import { fetchContactMessages } from '@/server/services/contact-message';
import { fetchCuzdan, type BorcDto } from '@/server/services/cuzdan';
import { fetchHabitWeek, isDayComplete } from '@/server/services/habit';
import { fetchHealthTrend } from '@/server/services/health-log';

export const metadata: Metadata = {
  title: 'Bugün',
  /* §8.7 — sayfa düzeyinde de `noindex`; middleware başlığına ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

function selamlama(simdi: Date): string {
  const saat = Number(
    new Intl.DateTimeFormat('tr-TR', { hour: 'numeric', timeZone: 'Europe/Istanbul' }).format(
      simdi,
    ),
  );
  if (saat < 5) return 'İyi geceler';
  if (saat < 12) return 'Günaydın';
  if (saat < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

/** 1 = pazartesi … 7 = pazar. */
function haftaGunu(gun: AppDay): number {
  const d = new Date(`${gun}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

const KISA = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const kisaTarih = (gun: AppDay) => KISA.format(new Date(`${gun}T00:00:00Z`));

/** Önümüzdeki 7 gün içindeki ödemeler — gün sayısıyla, en yakın önce. */
function yaklasanOdemeler(borclar: BorcDto[], bugun: AppDay) {
  return borclar
    .flatMap((b) => {
      if (b.isClosed || !b.paymentDay) return [];
      for (let kala = 0; kala <= 7; kala++) {
        const gun = addAppDays(bugun, kala);
        const [y, m] = gun.split('-').map(Number) as [number, number];
        const sonGun = new Date(Date.UTC(y, m, 0)).getUTCDate();
        if (Number(gun.slice(8, 10)) === Math.min(b.paymentDay, sonGun)) {
          return [{ borc: b, kala }];
        }
      }
      return [];
    })
    .sort((a, b) => a.kala - b.kala);
}

/**
 * BUGÜN (2026-10-30) — sabah açılıp her şeyin görüldüğü tek ekran.
 * Halkalar (alışkanlık · su · haftalık spor), bugünün antrenmanı, yaklaşan
 * ödemeler, bu ayın harcaması ve kilo eğilimi. Hepsi sunucuda; istemci JS'i
 * yalnızca "Başlat" düğmesinde.
 */
export default async function BugunPage() {
  const bugun = appToday();
  const pazartesi = addAppDays(bugun, -(haftaGunu(bugun) - 1));
  const [aliskanlik, saglik, oturumlar, acikOturum, program, mesajlar, cuzdan] = await Promise.all([
    fetchHabitWeek(bugun),
    fetchHealthTrend({ from: addAppDays(bugun, -29), to: bugun }),
    fetchRecentSessions(10),
    fetchActiveSession(),
    fetchProgram(),
    fetchContactMessages({ page: 1, perPage: 1 }),
    fetchCuzdan(),
  ]);

  // ── Halkalar ─────────────────────────────────────────────────────────────
  const sira = aliskanlik.days.indexOf(bugun);
  const aliskanlikToplam = aliskanlik.habits.length;
  const aliskanlikTamam = aliskanlik.habits.filter((h) =>
    isDayComplete(h.counts[sira] ?? 0, h.targetPerDay),
  ).length;
  const bugunKaydi = saglik.find((k) => k.date === bugun);
  const suMl = bugunKaydi?.waterMl ?? 0;
  const haftaHedefi = program.filter((g) => g.haftaGunu !== null).length || 5;
  const haftaAntrenman = oturumlar.filter((o) => o.date >= pazartesi && !o.suruyor).length;

  // ── Bugünün antrenmanı ───────────────────────────────────────────────────
  const bugununGunu = program.find((g) => g.haftaGunu === haftaGunu(bugun));
  const bugunYapildi = oturumlar.some((o) => o.date === bugun && !o.suruyor);

  // ── Kilo eğilimi ─────────────────────────────────────────────────────────
  const kilolar = saglik.flatMap((k) =>
    k.weightKg ? [{ gun: k.date, kg: Number(k.weightKg) }] : [],
  );
  const sonKilo = kilolar.at(-1);
  const kiloFark =
    sonKilo && kilolar.length > 1 ? sonKilo.kg - (kilolar[0]?.kg ?? sonKilo.kg) : null;

  const odemeler = yaklasanOdemeler(cuzdan.borclar, bugun);
  const simdi = new Date();
  const tarih = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(simdi);

  return (
    <>
      <Topbar title="Bugün" />

      <main id="panel-icerik" className="flex-1 px-4 py-5 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <header className="flex flex-col gap-0.5">
            <p className="text-muted text-sm capitalize">{tarih}</p>
            <h2 className="text-primary text-2xl font-semibold">{selamlama(simdi)} 👋</h2>
          </header>

          {/* ── HALKALAR ─────────────────────────────────────────────────── */}
          <section
            aria-label="Günün özeti"
            className="rounded-card border-line bg-surface flex items-center gap-5 border p-5"
          >
            <Halkalar
              oranlar={[
                aliskanlikToplam ? aliskanlikTamam / aliskanlikToplam : 0,
                suMl / SU_HEDEFI_ML,
                haftaAntrenman / haftaHedefi,
              ]}
            />
            <ul className="flex min-w-0 flex-1 flex-col gap-3">
              <HalkaSatiri href="/panel/hayat" renk="#8b5cf6" etiket="Alışkanlık">
                {aliskanlikTamam}
                <span className="text-muted text-sm font-normal"> / {aliskanlikToplam}</span>
              </HalkaSatiri>
              <HalkaSatiri href="/panel/saglik" renk="#0ea5e9" etiket="Su">
                {(suMl / 1000).toLocaleString('tr-TR')}
                <span className="text-muted text-sm font-normal"> / 3,5 L</span>
              </HalkaSatiri>
              <HalkaSatiri href="/panel/spor" renk="#f97316" etiket="Spor · bu hafta">
                {haftaAntrenman}
                <span className="text-muted text-sm font-normal"> / {haftaHedefi}</span>
              </HalkaSatiri>
            </ul>
          </section>

          {/* ── BUGÜNÜN ANTRENMANI ───────────────────────────────────────── */}
          {acikOturum ? (
            <Link
              href={`/panel/spor/oturum/${acikOturum.id}`}
              className="focus-ring rounded-card bg-gradient-accent flex items-center gap-4 p-4 text-white shadow-[0_12px_32px_-14px_var(--accent-glow)]"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-white/20">
                <Play className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm opacity-90">Antrenman sürüyor</span>
                <span className="truncate font-semibold">{acikOturum.gunAdi ?? 'Serbest'}</span>
              </span>
              <span className="text-sm font-medium">Devam et</span>
            </Link>
          ) : bugununGunu ? (
            <section className="rounded-card border-line bg-surface flex items-center gap-4 border p-4">
              <Rozet ikon={Dumbbell} renk="from-orange-500 to-amber-500" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-muted text-xs">
                  {bugunYapildi ? 'Bugün tamamlandı ✓' : 'Bugünün antrenmanı'}
                </span>
                <span className="text-primary truncate font-semibold">{bugununGunu.ad}</span>
                <span className="text-muted truncate text-xs">
                  {bugununGunu.hareketler.length} hareket
                  {bugununGunu.odak && ` · ${bugununGunu.odak}`}
                </span>
              </span>
              {!bugunYapildi && <BaslatDugmesi dayId={bugununGunu.id} vurgulu />}
            </section>
          ) : (
            program.length > 0 && (
              <p className="text-muted px-1 text-sm">
                Bugün programda antrenman yok — dinlenme günü 🌿
              </p>
            )
          )}

          {/* ── YAKLAŞAN ÖDEMELER ────────────────────────────────────────── */}
          {odemeler.length > 0 && (
            <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
              <h3 className="text-muted mb-1 flex items-center gap-2 text-xs font-medium">
                <CalendarClock className="size-4" aria-hidden="true" />
                Yaklaşan ödemeler
              </h3>
              {odemeler.map(({ borc, kala }) => (
                <Link
                  key={borc.id}
                  href={`/panel/cuzdan/borc/${borc.id}`}
                  className="focus-ring -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-primary truncate text-sm font-medium">{borc.name}</span>
                    <span className={cn('text-xs', kala <= 2 ? 'text-danger' : 'text-muted')}>
                      {kala === 0 ? 'Bugün' : kala === 1 ? 'Yarın' : `${kala} gün sonra`}
                    </span>
                  </span>
                  {borc.monthlyPayment && (
                    <span className="tabular text-primary shrink-0 text-sm font-semibold">
                      {miktarBicim(borc.monthlyPayment, borc.unit)}
                    </span>
                  )}
                </Link>
              ))}
            </section>
          )}

          {/* ── KARTLAR ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Kart
              href="/panel/cuzdan"
              ikon={Wallet}
              renk="from-emerald-500 to-teal-500"
              baslik="Bu ay"
            >
              <span className="tabular text-primary text-xl font-semibold tracking-tight">
                {paraBicim(cuzdan.ozet.aylikGiderTl, 'TRY')}
              </span>
              <span className="text-muted text-xs">
                harcandı · kalan{' '}
                <span
                  className={cn(
                    'tabular font-medium',
                    cuzdan.ozet.aylikKalanTl.startsWith('-') ? 'text-danger' : 'text-success',
                  )}
                >
                  {paraBicim(cuzdan.ozet.aylikKalanTl, 'TRY')}
                </span>
              </span>
            </Kart>

            <Kart href="/panel/saglik" ikon={Scale} renk="from-rose-500 to-pink-500" baslik="Kilo">
              {sonKilo ? (
                <>
                  <span className="flex items-baseline gap-1.5">
                    <span className="tabular text-primary text-xl font-semibold tracking-tight">
                      {sonKilo.kg.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-muted text-xs">kg</span>
                    {kiloFark !== null && kiloFark !== 0 && (
                      <span
                        className={cn(
                          'tabular text-xs font-medium',
                          kiloFark < 0 ? 'text-success' : 'text-warning',
                        )}
                      >
                        {kiloFark > 0 ? '↑' : '↓'}{' '}
                        {Math.abs(Number(kiloFark.toFixed(1))).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </span>
                  <Kivrim degerler={kilolar.map((k) => k.kg)} />
                </>
              ) : (
                <span className="text-muted text-sm">Son 30 günde ölçüm yok</span>
              )}
            </Kart>
          </div>

          {mesajlar.unreadCount > 0 && (
            <Link
              href="/panel/mesajlar?gorunum=okunmamis"
              className="focus-ring rounded-card border-line bg-surface flex items-center gap-3 border p-4"
            >
              <Rozet ikon={Mail} renk="from-sky-500 to-blue-600" />
              <span className="text-primary flex-1 text-sm font-medium">
                {mesajlar.unreadCount} okunmamış mesaj
              </span>
              <ChevronRight className="text-muted size-4" aria-hidden="true" />
            </Link>
          )}

          {sonKilo && (
            <p className="text-muted px-1 text-xs">Son tartı {kisaTarih(sonKilo.gun as AppDay)}</p>
          )}
        </div>
      </main>
    </>
  );
}

/* ===========================================================================
 * PARÇALAR
 * ======================================================================== */

const HALKA_RENK = ['#8b5cf6', '#0ea5e9', '#f97316'] as const;

/**
 * Üç iç içe halka (Apple Fitness benzeri). Oran 0–1'e sıkıştırılır; animasyon
 * yalnızca `stroke-dashoffset` (CSS, `halka-dol`).
 */
function Halkalar({ oranlar }: { oranlar: [number, number, number] }) {
  const boyut = 112;
  const kalinlik = 11;
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox={`0 0 ${boyut} ${boyut}`}
      className="shrink-0 -rotate-90"
      aria-hidden="true"
    >
      {oranlar.map((oran, i) => {
        const r = boyut / 2 - kalinlik / 2 - i * (kalinlik + 3);
        const cevre = 2 * Math.PI * r;
        const dolu = Math.min(1, Math.max(0, oran));
        return (
          <g key={i}>
            <circle
              cx={boyut / 2}
              cy={boyut / 2}
              r={r}
              fill="none"
              stroke={HALKA_RENK[i]}
              strokeOpacity={0.16}
              strokeWidth={kalinlik}
            />
            <circle
              cx={boyut / 2}
              cy={boyut / 2}
              r={r}
              fill="none"
              stroke={HALKA_RENK[i]}
              strokeWidth={kalinlik}
              strokeLinecap="round"
              strokeDasharray={cevre}
              strokeDashoffset={cevre * (1 - dolu)}
              className="halka-dol"
              style={{ ['--halka-cevre' as string]: cevre, animationDelay: `${i * 90}ms` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function HalkaSatiri({
  href,
  renk,
  etiket,
  children,
}: {
  href: string;
  renk: string;
  etiket: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="focus-ring flex flex-col rounded-lg">
        <span className="text-muted flex items-center gap-1.5 text-xs">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: renk }} />
          {etiket}
        </span>
        <span className="tabular text-primary text-lg leading-tight font-semibold">{children}</span>
      </Link>
    </li>
  );
}

function Rozet({ ikon: Ikon, renk }: { ikon: LucideIcon; renk: string }) {
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
        renk,
      )}
    >
      <Ikon className="size-5" aria-hidden="true" />
    </span>
  );
}

function Kart({
  href,
  ikon: Ikon,
  renk,
  baslik,
  children,
}: {
  href: string;
  ikon: LucideIcon;
  renk: string;
  baslik: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-card border-line bg-surface flex min-w-0 flex-col gap-2 border p-4 transition-transform active:scale-[0.98]"
    >
      <span className="text-muted flex items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-[0.6rem] bg-linear-to-br text-white shadow-sm',
            renk,
          )}
        >
          <Ikon className="size-4" aria-hidden="true" />
        </span>
        {baslik}
      </span>
      {children}
    </Link>
  );
}

/** Mini kilo eğrisi (sparkline) — eksen yok, yalnızca şekil. */
function Kivrim({ degerler }: { degerler: number[] }) {
  if (degerler.length < 2) return null;
  const gen = 120;
  const yuk = 32;
  const min = Math.min(...degerler);
  const max = Math.max(...degerler);
  const aralik = max - min || 1;
  const nokta = degerler
    .map(
      (v, i) =>
        `${((i / (degerler.length - 1)) * gen).toFixed(1)},${(yuk - 3 - ((v - min) / aralik) * (yuk - 6)).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${gen} ${yuk}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={nokta}
        fill="none"
        stroke="#f43f5e"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="grafik-cizgi"
      />
    </svg>
  );
}
