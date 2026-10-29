import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { GunlukListe } from '@/components/panel/gunluk-liste';
import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { OnerilenAliskanliklar } from '@/components/panel/onerilen-aliskanliklar';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { dayDateSchema } from '@/lib/schemas/common';
import { addAppDays, appToday } from '@/server/services/_shared';
import { fetchHabitDay, type GunlukListeDto } from '@/server/services/habit-gun';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Hayat',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function gunEtiketi(gun: string, bugun: string): string {
  if (gun === bugun) return 'Bugün';
  if (gun === addAppDays(bugun, -1)) return 'Dün';
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${gun}T00:00:00Z`));
}

/**
 * HAYAT · BUGÜN (2026-10-29, telefon öncelikli yeniden yazım).
 *
 * Sahibi alışkanlıklarını her gün SIRAYLA işaretliyor: yaptım ya da yapmadım.
 * Ekran o akış için: gün seçici (geçmiş günler düzeltilebilir, gelecek yok),
 * ilerleme, sıralı liste ve "günün raporu" — hangisini yapmadın, hangisi eksik
 * kaldı, hangisini hiç işaretlemedin.
 */
export default async function HayatPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const bugun = appToday();
  const istenen = dayDateSchema.safeParse(tek(parametreler.gun));
  const gun = istenen.success && istenen.data <= bugun ? istenen.data : bugun;

  const liste = await fetchHabitDay(gun, undefined, bugun);
  const { ozet } = liste;
  const oran = ozet.toplam === 0 ? 0 : Math.round((ozet.yapildi / ozet.toplam) * 100);
  const etiket = gunEtiketi(gun, bugun);

  return (
    <>
      <Topbar
        title="Hayat"
        actions={
          <Link
            href="/panel/hayat/aliskanliklar"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Settings2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Alışkanlıkları düzenle</span>
            <span className="sr-only sm:hidden">Alışkanlıkları düzenle</span>
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <HayatAltMenu aktif="genel" />

          {/* ── GÜN SEÇİCİ ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/panel/hayat?gun=${addAppDays(gun, -1)}`}
              aria-label="Önceki gün"
              className="focus-ring rounded-btn text-body hover:bg-elevated flex size-11 items-center justify-center"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Link>
            <div className="flex flex-col items-center">
              <span className="text-primary text-lg font-semibold capitalize">{etiket}</span>
              {gun !== bugun && (
                <Link href="/panel/hayat" className="text-accent text-xs font-medium">
                  Bugüne dön
                </Link>
              )}
            </div>
            {gun < bugun ? (
              <Link
                href={`/panel/hayat?gun=${addAppDays(gun, 1)}`}
                aria-label="Sonraki gün"
                className="focus-ring rounded-btn text-body hover:bg-elevated flex size-11 items-center justify-center"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            ) : (
              <span className="size-11" aria-hidden="true" />
            )}
          </div>

          {ozet.toplam === 0 ? (
            <section className="rounded-card border-line bg-surface flex flex-col items-center gap-4 border p-6 text-center">
              <p className="text-primary font-semibold">Henüz alışkanlık yok</p>
              <p className="text-muted text-sm">
                Her gün işaretleyeceğin listeyi tek dokunuşla ekleyebilir ya da kendin
                oluşturabilirsin.
              </p>
              <OnerilenAliskanliklar />
              <Link
                href="/panel/hayat/aliskanliklar/yeni"
                className="text-accent text-sm font-medium"
              >
                Kendim ekleyeceğim
              </Link>
            </section>
          ) : (
            <>
              {/* ── İLERLEME ───────────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted text-sm">İlerleme</span>
                  <span className="tabular text-primary text-sm font-semibold">
                    {ozet.yapildi} / {ozet.toplam} · %{oran}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={oran}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${etiket} ilerleme`}
                  className="bg-elevated h-2.5 overflow-hidden rounded-full"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-500',
                      oran === 100 ? 'bg-success' : 'bg-accent',
                    )}
                    style={{ width: `${oran}%` }}
                  />
                </div>
              </div>

              <GunlukListe gun={gun} items={liste.items} />

              <GunRaporu liste={liste} etiket={etiket} />
            </>
          )}
        </div>
      </main>
    </>
  );
}

/**
 * "Günün raporu" — sahibinin istediği dil: "bugün bunu yapmadın, bunu eksik
 * yaptın". İşaretlenmemişler AYRI: "yapmadın" demek, söylenmemiş bir şeyi
 * iddia etmek olurdu.
 */
function GunRaporu({ liste, etiket }: { liste: GunlukListeDto; etiket: string }) {
  const { items, ozet } = liste;
  const yapilmadi = items.filter((i) => i.durum === 'YAPILMADI');
  const eksik = items.filter((i) => i.durum === 'EKSIK');
  const isaretsiz = items.filter((i) => i.durum === 'ISARETSIZ');
  const gecmis = liste.gun < liste.bugun;
  const zaman = etiket === 'Bugün' ? 'bugün' : etiket === 'Dün' ? 'dün' : 'o gün';

  return (
    <section
      aria-labelledby="gun-raporu"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <h2 id="gun-raporu" className="text-primary text-base font-semibold">
        Günün raporu
      </h2>

      {ozet.yapildi === ozet.toplam ? (
        <p className="text-success text-sm font-medium">
          Tebrikler — {zaman} hepsini tamamladın. 🎉
        </p>
      ) : (
        <ul className="text-body flex flex-col gap-2 text-sm">
          {yapilmadi.length > 0 && (
            <li>
              <span className="text-danger font-medium">Yapmadın: </span>
              {yapilmadi.map((i) => i.name).join(', ')}
            </li>
          )}
          {eksik.length > 0 && (
            <li>
              <span className="text-warning font-medium">Eksik kaldı: </span>
              {eksik.map((i) => `${i.name} (${i.count}/${i.targetPerDay})`).join(', ')}
            </li>
          )}
          {isaretsiz.length > 0 && (
            <li>
              <span className="text-muted font-medium">
                {gecmis ? 'İşaretlenmedi: ' : 'Sırada: '}
              </span>
              {isaretsiz.map((i) => i.name).join(', ')}
            </li>
          )}
          {ozet.yapildi > 0 && (
            <li className="text-muted">{ozet.yapildi} alışkanlığı tamamladın.</li>
          )}
        </ul>
      )}

      <Link href="/panel/hayat/rapor" className="text-accent w-fit text-sm font-medium">
        Haftalık / aylık rapor →
      </Link>
    </section>
  );
}
