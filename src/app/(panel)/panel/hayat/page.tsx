import { BookOpen, ChevronLeft, ChevronRight, Plus, Target } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AliskanlikPanosu } from '@/components/panel/aliskanlik-panosu';
import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { gunAyYil, haftaAraligi, hayatYolu, kalanGunMetni } from '@/components/panel/hayat-bicim';
import { HedefIlerleme } from '@/components/panel/hedef-ilerleme';
import { HEDEF_KATEGORISI, RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { Topbar } from '@/components/panel/topbar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { dayDateSchema } from '@/lib/schemas/common';
import { addAppDays, appToday, startOfAppWeek } from '@/server/services/_shared';
import { fetchGoals } from '@/server/services/goal';
import { fetchHabitWeek } from '@/server/services/habit';
import { fetchJournalEntries } from '@/server/services/journal-entry';

export const metadata: Metadata = {
  title: 'Hayat',
  robots: { index: false, follow: false, nocache: true },
};

/** Genel bakıştaki kısa listelerin boyu — tam liste kendi sayfasında. */
const KISA_LISTE = 5;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

/**
 * `/panel/hayat` — §4.2 "alışkanlık takibi, hedefler, günlük" GENEL BAKIŞI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `?hafta=` KULLANICI GİRDİSİ — DOĞRULANIYOR VE GELECEĞE TAŞAMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Adres çubuğu kullanıcı girdisidir (ADR-032): `dayDateSchema`dan geçmeyen
 * değer BUGÜNE düşüyor. Geçerli ama GELECEKTEKİ bir gün de bugüne çekiliyor:
 * gelecek haftanın panosu yalnızca devre dışı hücrelerden oluşurdu — hata
 * değil ama işe yaramayan bir ekran. Servis zaten herhangi bir günü kabul
 * edip o günün PAZARTESİ başlangıçlı haftasını döndürüyor; adres her gün
 * olabilir, bağlantılar yine de hep pazartesiyi yazıyor (tek kanonik adres).
 *
 * ÜÇ BAĞIMSIZ OKUMA, PARALEL: pano (`fetchHabitWeek`), aktif hedefler
 * (`fetchGoals`, ilk 5) ve son günlükler (`fetchJournalEntries`, ilk 5 — liste
 * DTO'su, tam metin TAŞIMIYOR). Biri diğerinin girdisi değil.
 */
export default async function HayatPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const bugun = appToday();

  const istenen = dayDateSchema.safeParse(tek(parametreler.hafta));
  const gun = istenen.success && istenen.data <= bugun ? istenen.data : bugun;

  const [hafta, hedefler, gunlukler] = await Promise.all([
    fetchHabitWeek(gun),
    fetchGoals({ status: 'ACTIVE', page: 1, perPage: KISA_LISTE }),
    fetchJournalEntries({ page: 1, perPage: KISA_LISTE }),
  ]);

  const haftaBasi = startOfAppWeek(gun);
  const buHafta = haftaBasi === startOfAppWeek(bugun);
  const oncekiHafta = addAppDays(haftaBasi, -7);
  const sonrakiHafta = addAppDays(haftaBasi, 7);
  const ilkGun = hafta.days[0] ?? haftaBasi;
  const sonGun = hafta.days[6] ?? addAppDays(haftaBasi, 6);

  return (
    <>
      <Topbar
        title="Hayat"
        actions={
          <Link href="/panel/hayat/gunluk/yeni" className={buttonClasses({ size: 'sm' })}>
            <Plus className="size-4" aria-hidden="true" />
            Günlük yaz
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl min-w-0 flex-col gap-8">
          <HayatAltMenu aktif="genel" />

          {/* ── Alışkanlık panosu ─────────────────────────────────────── */}
          <section aria-labelledby="pano-baslik" className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="pano-baslik" className="text-primary text-base font-semibold">
                  Alışkanlıklar
                </h2>
                <p className="tabular text-muted text-sm">{haftaAraligi(ilkGun, sonGun)}</p>
              </div>

              <nav aria-label="Hafta gezinmesi" className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={hayatYolu(oncekiHafta)}
                  className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Önceki
                </Link>
                {buHafta ? (
                  <span
                    aria-current="page"
                    className="rounded-btn border-accent/40 bg-accent/12 text-accent-soft border px-3 py-1.5 text-sm"
                  >
                    Bu hafta
                  </span>
                ) : (
                  <>
                    <Link
                      href={hayatYolu()}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      Bu hafta
                    </Link>
                    {/*
                      "Sonraki" yalnızca GEÇMİŞ bir haftadayken: bu haftadan
                      ileriye gitmek tamamen devre dışı bir pano gösterirdi.
                    */}
                    <Link
                      href={hayatYolu(sonrakiHafta)}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      Sonraki
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  </>
                )}
              </nav>
            </div>

            <AliskanlikPanosu hafta={hafta} />

            <Link
              href="/panel/hayat/aliskanliklar"
              className="focus-ring rounded-btn text-body hover:text-primary self-start text-sm underline underline-offset-4"
            >
              Alışkanlıkları yönet
            </Link>
          </section>

          <div className="grid min-w-0 gap-8 lg:grid-cols-2">
            {/* ── Aktif hedefler ────────────────────────────────────────── */}
            <section aria-labelledby="hedef-baslik" className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="hedef-baslik" className="text-primary text-base font-semibold">
                  Aktif hedefler
                </h2>
                {hedefler.total > 0 && (
                  <Link
                    href="/panel/hayat/hedefler?gorunum=aktif"
                    className="focus-ring rounded-btn text-body hover:text-primary text-sm underline underline-offset-4"
                  >
                    Tümü (<span className="tabular">{hedefler.total}</span>)
                  </Link>
                )}
              </div>

              {hedefler.items.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Aktif hedef yok"
                  description="Bir hedef tanımla; ilerlemesini ve hedef tarihe kalan günü burada izlersin."
                  action={
                    <Link
                      href="/panel/hayat/hedefler/yeni"
                      className={buttonClasses({ size: 'sm' })}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Hedef ekle
                    </Link>
                  }
                />
              ) : (
                <ul className="border-line bg-surface rounded-card divide-line divide-y border">
                  {hedefler.items.map((h) => {
                    const kalan = kalanGunMetni(h.daysLeft);
                    return (
                      <li key={h.id} className="flex flex-col gap-2 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Link
                            href={`/panel/hayat/hedefler/${h.id}`}
                            className="focus-ring rounded-btn text-primary -m-1 min-w-0 p-1 font-medium break-words"
                          >
                            {h.title}
                          </Link>
                          {kalan && <Badge variant={kalan.ton}>{kalan.metin}</Badge>}
                        </div>
                        <HedefIlerleme baslik={`${h.title} ilerlemesi`} ilerleme={h.progress} />
                        <p className="text-muted text-xs">
                          {HEDEF_KATEGORISI[h.category]}
                          {h.targetDate && (
                            <>
                              {' · '}
                              <span className="tabular">{gunAyYil(h.targetDate)}</span>
                            </>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Son günlükler ─────────────────────────────────────────── */}
            <section aria-labelledby="gunluk-baslik" className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="gunluk-baslik" className="text-primary text-base font-semibold">
                  Son günlükler
                </h2>
                {gunlukler.total > 0 && (
                  <Link
                    href="/panel/hayat/gunluk"
                    className="focus-ring rounded-btn text-body hover:text-primary text-sm underline underline-offset-4"
                  >
                    Tümü (<span className="tabular">{gunlukler.total}</span>)
                  </Link>
                )}
              </div>

              {gunlukler.items.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Henüz günlük yok"
                  description="Günün nasıl geçtiğini birkaç cümleyle yaz. Yalnızca panelde görünür; içerik denetim kaydına yazılmaz."
                  action={
                    <Link href="/panel/hayat/gunluk/yeni" className={buttonClasses({ size: 'sm' })}>
                      <Plus className="size-4" aria-hidden="true" />
                      İlk günlüğü yaz
                    </Link>
                  }
                />
              ) : (
                <ul className="border-line bg-surface rounded-card divide-line divide-y border">
                  {gunlukler.items.map((g) => (
                    <li key={g.id} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/panel/hayat/gunluk/${g.id}`}
                          className="focus-ring rounded-btn text-primary -m-1 min-w-0 p-1 font-medium break-words"
                        >
                          {g.title ?? gunAyYil(g.date)}
                        </Link>
                        <span className="tabular text-muted text-xs">
                          {g.title ? gunAyYil(g.date) : null}
                          {g.mood ? `${g.title ? ' · ' : ''}${RUH_HALI[g.mood]}` : null}
                        </span>
                      </div>
                      <p className="text-body line-clamp-2 text-sm break-words">{g.excerpt}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
