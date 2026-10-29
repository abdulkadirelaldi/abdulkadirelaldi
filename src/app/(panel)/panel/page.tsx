import {
  Activity,
  ChevronRight,
  Dumbbell,
  Mail,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ANTRENMAN_TURU, olcuBicim } from '@/components/panel/kisisel-etiketler';
import { paraBicim } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { cn } from '@/lib/utils/cn';
import { appToday } from '@/server/services/_shared';
import { fetchContactMessages } from '@/server/services/contact-message';
import { fetchCuzdan } from '@/server/services/cuzdan';
import { fetchHabitWeek, isDayComplete } from '@/server/services/habit';
import { fetchHealthLogs } from '@/server/services/health-log';
import { fetchWorkouts } from '@/server/services/workout';

export const metadata: Metadata = {
  title: 'Bugün',
  /* §8.7 — sayfa düzeyinde de `noindex`; middleware başlığına ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

/** İstanbul saatine göre selamlama — sunucu saat diliminden bağımsız (ADR-016). */
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

/**
 * BUGÜN — panelin ana ekranı (2026-10-29, telefon öncelikli yeniden yazım).
 *
 * İş, müşteri ve muhasebe kartları modüllerle birlikte kaldırıldı. Ekran,
 * telefonda açıldığında "bugün ne durumdayım" sorusunu tek bakışta yanıtlıyor:
 * alışkanlık ilerlemesi en üstte (her gün işaretlenen tek şey), altında son
 * ölçüm, son antrenman, net varlık (Cüzdan) ve okunmamış mesaj. Her kart kendi
 * bölümüne gider.
 *
 * "Bugün" İstanbul gününe göre (`appToday`, ADR-016).
 */
export default async function BugunPage() {
  const bugun = appToday();
  const [aliskanlik, olcumler, antrenmanlar, mesajlar, cuzdan] = await Promise.all([
    fetchHabitWeek(bugun),
    /* EN SON kayıt, pencere yok: kilo yavaş değişir ve ölçümün günü yanında yazılı. */
    fetchHealthLogs({ page: 1, perPage: 1 }),
    fetchWorkouts({ page: 1, perPage: 1 }),
    /* `unreadCount` filtreden bağımsız (T-038) — satır gerekmiyor. */
    fetchContactMessages({ page: 1, perPage: 1 }),
    fetchCuzdan(),
  ]);

  const sonOlcum = olcumler.items[0];
  const sonAntrenman = antrenmanlar.items[0];
  const bugunSirasi = aliskanlik.days.indexOf(bugun);
  const toplam = aliskanlik.habits.length;
  const tamamlanan = aliskanlik.habits.filter((h) =>
    isDayComplete(h.counts[bugunSirasi] ?? 0, h.targetPerDay),
  ).length;
  const oran = toplam === 0 ? 0 : Math.round((tamamlanan / toplam) * 100);

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
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <header className="flex flex-col gap-1">
            <p className="text-muted text-sm capitalize">{tarih}</p>
            <h2 className="text-primary text-2xl font-semibold">{selamlama(simdi)} 👋</h2>
          </header>

          {/* ── ALIŞKANLIKLAR — her gün işaretlenen tek şey, en üstte ─────── */}
          <Link
            href="/panel/hayat"
            className="focus-ring rounded-card border-line bg-surface flex flex-col gap-3 border p-5 transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-primary flex items-center gap-2 font-semibold">
                <Sparkles className="text-accent size-5" aria-hidden="true" />
                Bugünün alışkanlıkları
              </span>
              <ChevronRight className="text-muted size-5" aria-hidden="true" />
            </div>
            {toplam > 0 ? (
              <>
                <p className="tabular text-primary text-3xl font-semibold">
                  {tamamlanan}
                  <span className="text-muted text-lg"> / {toplam}</span>
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={oran}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Bugünkü ilerleme"
                  className="bg-elevated h-2 overflow-hidden rounded-full"
                >
                  <div
                    className="bg-accent h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${oran}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-muted text-sm">Henüz alışkanlık yok — eklemek için dokun.</p>
            )}
          </Link>

          <OzetKart
            href="/panel/cuzdan"
            ikon={Wallet}
            renk="yesil"
            baslik="Net varlık"
            deger={paraBicim(cuzdan.ozet.netTl, 'TRY')}
            alt={`Ay sonunda kalan ${paraBicim(cuzdan.ozet.aylikKalanTl, 'TRY')}`}
          />

          <div className="grid grid-cols-2 gap-3">
            <OzetKart
              href="/panel/saglik"
              ikon={Activity}
              renk="pembe"
              baslik="Son tartı"
              deger={sonOlcum ? olcuBicim(sonOlcum.weightKg, 'kg') : '—'}
              alt={sonOlcum ? sonOlcum.date : 'Henüz ölçüm yok'}
            />
            <OzetKart
              href="/panel/spor"
              ikon={Dumbbell}
              renk="turuncu"
              baslik="Son antrenman"
              deger={sonAntrenman ? ANTRENMAN_TURU[sonAntrenman.type] : '—'}
              alt={
                sonAntrenman
                  ? `${sonAntrenman.date} · ${sonAntrenman.setCount} set`
                  : 'Henüz antrenman yok'
              }
            />
          </div>

          {mesajlar.unreadCount > 0 && (
            <OzetKart
              href="/panel/mesajlar?gorunum=okunmamis"
              ikon={Mail}
              renk="mavi"
              baslik="Okunmamış mesaj"
              deger={String(mesajlar.unreadCount)}
              alt="Siteden gelen iletişim formları"
            />
          )}
        </div>
      </main>
    </>
  );
}

/** Dokunulabilir özet kartı — tamamı bağlantı, en az 44 px dokunma alanı. */
/** Bölüm renkleri — simge rozetinde; iki temada da okunur (beyaz simge). */
const ROZET = {
  yesil: 'from-emerald-500 to-teal-500',
  pembe: 'from-rose-500 to-pink-500',
  turuncu: 'from-orange-500 to-amber-500',
  mavi: 'from-sky-500 to-blue-600',
} as const;

function OzetKart({
  href,
  ikon: Ikon,
  renk,
  baslik,
  deger,
  alt,
}: {
  href: string;
  ikon: LucideIcon;
  renk: keyof typeof ROZET;
  baslik: string;
  deger: ReactNode;
  alt: string;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-card border-line bg-surface flex flex-col gap-2.5 border p-4 transition-transform active:scale-[0.98]"
    >
      <span className="text-muted flex items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-[0.6rem] bg-linear-to-br text-white shadow-sm',
            ROZET[renk],
          )}
        >
          <Ikon className="size-4" aria-hidden="true" />
        </span>
        {baslik}
      </span>
      <span className="tabular text-primary truncate text-[1.375rem] font-semibold tracking-tight">
        {deger}
      </span>
      <span className="tabular text-muted truncate text-xs">{alt}</span>
    </Link>
  );
}
