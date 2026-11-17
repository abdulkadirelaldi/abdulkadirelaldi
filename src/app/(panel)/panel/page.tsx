import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { GunlukListe } from '@/components/panel/gunluk-liste';
import { BugunIslerKarti } from '@/components/panel/isler/bugun-isler-karti';
import { BugunTakvimKarti } from '@/components/panel/takvim/bugun-karti';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchBugunGorevleri } from '@/server/services/gorev';
import { fetchHabitWeek } from '@/server/services/habit';
import { fetchHabitDay } from '@/server/services/habit-gun';
import { fetchBugunTakvim } from '@/server/services/takvim';

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

/**
 * BUGÜN (ADR-053, 2026-11-17) — yalnızca bugün: işler, takvim, rutinler. Para, sağlık ve spor
 * kendi sekmelerinde. Boş bölüm HİÇ çizilmez; üçü de boşsa tek bir sakin satır. Önceki hâli
 * (halkalar, cüzdan, kilo, net varlık, haftalık grafik, hedefler… 15+ kart) sahibine göre "gözü
 * yoran" bir ekrandı.
 */
export default async function PanelHomePage() {
  const bugun = appToday();
  const [isler, takvim, rutinler, hafta] = await Promise.all([
    fetchBugunGorevleri(bugun),
    fetchBugunTakvim(bugun),
    fetchHabitDay(bugun, undefined, bugun),
    fetchHabitWeek(bugun),
  ]);

  // Rutin: bugün işaretlenmemiş ya da eksik kalanlar; gerekli olanlar önce.
  const kalanRutin = rutinler.items
    .filter((i) => i.durum === 'ISARETSIZ' || i.durum === 'EKSIK')
    .sort((a, b) => Number(b.gerekli) - Number(a.gerekli));
  const rutinVar = rutinler.items.length > 0;
  const seriler = Object.fromEntries(
    hafta.habits
      .filter((h) => h.streak.value > 0)
      .map((h) => [h.id, `${h.streak.value} ${h.streak.unit === 'day' ? 'gün' : 'hafta'}`]),
  );

  const simdi = new Date();
  const tarih = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(simdi);
  const ozet = [
    isler.length > 0 ? `${isler.length} iş` : null,
    takvim.length > 0 ? `${takvim.length} etkinlik` : null,
    kalanRutin.length > 0 ? `${kalanRutin.length} rutin` : null,
  ].filter(Boolean);

  return (
    <>
      <Topbar title="Bugün" />

      <main id="panel-icerik" className="flex-1 px-4 py-5 pb-28 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <p className="text-muted text-sm capitalize">{tarih}</p>
            <h2 className="text-primary text-2xl font-semibold">{selamlama(simdi)}</h2>
            <p className="text-body text-sm">
              {ozet.length > 0 ? `Bugün ${ozet.join(' · ')}.` : 'Bugün için bekleyen bir şey yok.'}
            </p>
          </header>

          {isler.length > 0 && <BugunIslerKarti bugun={bugun} gorevler={isler} />}

          {takvim.length > 0 && <BugunTakvimKarti bugun={bugun} olusumlar={takvim} />}

          {rutinVar && (
            <section aria-labelledby="rutin-baslik" className="flex flex-col gap-2.5">
              <BolumBasligi id="rutin-baslik" href="/panel/hayat" baglanti="Hayat">
                Bugünün rutinleri
              </BolumBasligi>
              {kalanRutin.length === 0 ? (
                <p className="text-success text-sm">Bugünün rutinleri tamam ✓</p>
              ) : (
                <GunlukListe gun={bugun} items={kalanRutin} seriler={seriler} />
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function BolumBasligi({
  id,
  href,
  baglanti,
  children,
}: {
  id: string;
  href: string;
  baglanti: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 id={id} className="text-primary text-base font-semibold">
        {children}
      </h3>
      <Link
        href={href}
        className="focus-ring text-accent inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded text-xs font-medium"
      >
        {baglanti}
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
