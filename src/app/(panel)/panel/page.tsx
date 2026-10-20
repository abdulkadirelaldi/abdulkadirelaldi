import { Briefcase, FolderOpen, Mail, ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EYLEM_ETIKET, EYLEM_VARYANT } from '@/components/panel/denetim-gorunumleri';
import { Topbar } from '@/components/panel/topbar';
import { Badge } from '@/components/ui/badge';
import { Currency, JobStatus } from '@/types';
import { buttonClasses } from '@/components/ui/button';
import { paraBicim } from '@/components/panel/para-bicim';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { fetchAuditLog } from '@/server/services/audit-log';
import { fetchContactMessages } from '@/server/services/contact-message';
import { fetchMonthlyReport } from '@/server/services/report';
import { fetchJobsForPanel } from '@/server/services/job';
import { fetchSiteStats } from '@/server/services/stats';
import { ANTRENMAN_TURU, olcuBicim } from '@/components/panel/kisisel-etiketler';
import { appToday } from '@/server/services/_shared';
import { fetchHabitWeek, isDayComplete } from '@/server/services/habit';
import { fetchHealthLogs } from '@/server/services/health-log';
import { fetchWorkouts } from '@/server/services/workout';

export const metadata: Metadata = {
  title: 'Panel',
  /* §8.7 — sayfa düzeyinde de `noindex`; middleware başlığına ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel` — dashboard (T-033).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖNCESİNDE NE VARDI: UYDURMA SAYILAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-002 yer tutucusu dört kart çiziyordu — "Bu ay gelir 48.250,00", "Bu ay
 * gider 11.907,50", "Aktif iş 3", "Okunmamış mesaj 11" — hiçbiri gerçek
 * değildi. "Yer tutucu" rozeti taşıyordu ama ekranda duran şey yine uydurma
 * veriydi, ve yanında hiçbir şey yapmayan bir "İşlem ekle" düğmesi vardı.
 * İkisi de bu turda kalktı: ADR-027'nin uydurma istatistik yasağı ve T-018'in
 * ölü düğme yasağı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜÇÜNCÜ YOL: BUGÜN TÜRETİLEBİLENİ GÖSTER, GERİ KALANI DÜRÜSTÇE SÖYLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §4.2 dört şey istiyor: aylık gelir/gider, aktif işler, bugünün planı, sağlık
 * özeti. T-054f'te DÖRDÜNDEN ÜÇÜ türetilemiyordu — finans, iş ve sağlık
 * servisleri yazılmamıştı. (F4 finansı ve işi, F5 kişisel özeti getirdi; bugün
 * dördü de gerçek veriden.) O gün iki kolay ve iki yanlış seçenek vardı:
 *
 *   - BOŞ KARTLAR: dört kart iskeleti, içi "—". Ölü arayüz; kullanıcı her gün
 *     bakıp hiçbir şey öğrenmez ve kartların bozuk olduğunu sanır.
 *   - UYDURMA VERİ: önceki hâl. Panelin söylediği hiçbir sayıya güvenilmez.
 *
 * Seçilen üçüncü yol T-036b'de CV alanı için verilen kararın aynısı: BUGÜNKÜ
 * HÂLİ söylemek. Türetilebilen üç şey gerçek kartlar olarak duruyor; geri kalan
 * üçü TEK bir bilgi bloğunda, hangi modülü beklediği yazılı ve TARİH SÖZÜ
 * VERİLMEDEN. Blok bir kart iskeleti DEĞİL — "burada bir kart olacak" diye yer
 * ayırmak, boş kartın kılık değiştirmiş hâli olurdu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OKUMALAR — ÜÇÜ DE ÖNBELEKSİZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetchSiteStats` (ham), `fetchContactMessages`, `fetchAuditLog`. Panel
 * okumaları `getX` (önbellekli) değil `fetchX` kullanır: panelde bir dakika
 * eski sayı, "kaydettim ama görünmüyor" sorusunu üretir.
 */

/** Son denetim satırı sayısı — dashboard bir özet, liste değil. */
const SON_DENETIM_SAYISI = 5;

export default async function PanelDashboardPage() {
  const simdi = new Date();

  const [istatistik, mesajlar, denetim, aylik, aktifIsler] = await Promise.all([
    fetchSiteStats({}),
    /*
      `unreadCount` FİLTREDEN BAĞIMSIZ geliyor (T-038), o yüzden `perPage: 1`
      yeterli: satırlara ihtiyaç yok, yalnızca sayaca. Satır istemek 25 mesajı
      boşuna okumak olurdu.
    */
    fetchContactMessages({ page: 1, perPage: 1 }),
    fetchAuditLog({ page: 1, perPage: SON_DENETIM_SAYISI, sort: 'desc' }),
    /*
      ⚠️ T-054f'te BU KART BİLEREK YOKTU: "uydurma bir sayı göstermemeyi
      tercih ediyoruz". T-104/T-105 ile GERÇEK sayı geldi, kart artık var.

      NAKİT ESASI (`net.cash`): dashboard tek bir sayı göstermek zorunda ve
      "elimde ne var" sorusu nakit esasıdır. Hangi esas olduğu kartta YAZILI;
      tahakkuk için rapor ekranına bağlantı var. İki esası dashboard'da yan
      yana koymak, en kısa bakışta en çok karıştırılacak yer olurdu.
    */
    fetchMonthlyReport(simdi.getFullYear(), simdi.getMonth() + 1),
    /* Yalnızca SAYAÇ gerekiyor — `perPage: 1`, satırlara ihtiyaç yok. */
    fetchJobsForPanel({ page: 1, perPage: 1, status: JobStatus.ACTIVE }),
  ]);

  /*
    KİŞİSEL ÖZET — üç okuma, üçü de küçük. "Bugün" sunucuda İstanbul gününe
    göre (`appToday`, ADR-016); `simdi.getMonth()` gibi sunucu saat dilimine
    bağlı bir değer burada gece yarısından sonra üç saat yanlış gün verirdi.
  */
  const bugun = appToday();
  const [olcumler, antrenmanlar, aliskanlik] = await Promise.all([
    /* EN SON kayıt, pencere yok: kilo yavaş değişir ve son ölçümün GÜNÜ yanında yazılı. */
    fetchHealthLogs({ page: 1, perPage: 1 }),
    fetchWorkouts({ page: 1, perPage: 1 }),
    fetchHabitWeek(bugun),
  ]);
  const sonOlcum = olcumler.items[0];
  const sonAntrenman = antrenmanlar.items[0];
  const bugunSirasi = aliskanlik.days.indexOf(bugun);
  const bugunTamamlanan = aliskanlik.habits.filter((h) =>
    isDayComplete(h.counts[bugunSirasi] ?? 0, h.targetPerDay),
  ).length;

  return (
    <>
      <Topbar title="Panel" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          {/* ── BUGÜN TÜRETİLEBİLEN ──────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OzetKart
              ikon={Briefcase}
              etiket="Aktif iş"
              deger={aktifIsler.total}
              not="Panoda ACTIVE durumunda"
              href="/panel/isler"
              bagEtiketi="Panoya git"
            />

            <OzetKart
              ikon={Mail}
              etiket="Okunmamış mesaj"
              deger={mesajlar.unreadCount}
              not="Spam ve arşiv hariç"
              href="/panel/mesajlar?gorunum=okunmamis"
              bagEtiketi="Mesajlara git"
            />

            <OzetKart
              ikon={FolderOpen}
              etiket="Yayındaki proje"
              deger={istatistik.publishedProjects}
              not="Taslak ve zamanlanmış hariç"
              href="/panel/icerik/projeler?durum=yayinda"
              bagEtiketi="Projelere git"
            />

            <OzetKart
              ikon={ScrollText}
              etiket="Deneyim yılı"
              deger={istatistik.experienceYears}
              not="En erken kayıttan bugüne tam yıl"
              href="/panel/icerik/deneyim"
              bagEtiketi="Deneyime git"
            />
          </div>

          {/* ── BU AY, NAKİT ESASI — T-105'te geldi ──────────────────────── */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <CardTitle seviye="h2">Bu ay · nakit esası</CardTitle>
                <Link
                  href="/panel/muhasebe/raporlar"
                  className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                >
                  Raporlar
                </Link>
              </div>

              <dl className="grid gap-4 sm:grid-cols-3">
                <FinansKutu
                  etiket="Tahsil edilen"
                  tutar={aylik.income.collected}
                  renk="text-success"
                />
                <FinansKutu etiket="Ödenen" tutar={aylik.expense.paid} renk="text-danger" />
                <FinansKutu etiket="Net" tutar={aylik.net.cash} renk="text-primary" />
              </dl>

              <p className="text-muted text-xs">
                Eline geçen ve elinden çıkan para. Kesilmiş ama tahsil edilmemiş tutarlar bu kartta{' '}
                <span className="text-body">yok</span> — tahakkuk esası raporlarda.
              </p>
            </CardContent>
          </Card>

          {/* ── SON DEĞİŞİKLİKLER ────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <CardTitle seviye="h2">Son değişiklikler</CardTitle>
                <Link
                  href="/panel/ayarlar/denetim"
                  className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                >
                  Tüm denetim kaydı
                </Link>
              </div>

              {denetim.items.length === 0 ? (
                <p className="text-muted text-sm">
                  Henüz kayıt yok. Panelde bir şey değiştirdiğinde ilk satır burada görünecek.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {denetim.items.map((kayit) => (
                    <li
                      key={kayit.id}
                      className="border-line flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-2 last:border-b-0 last:pb-0"
                    >
                      <Badge variant={EYLEM_VARYANT[kayit.action]}>
                        {EYLEM_ETIKET[kayit.action]}
                      </Badge>
                      <span className="text-body text-sm">{kayit.entity}</span>
                      {/* §3.2 — tarih sekmeli rakam, satırlar hizalanabilsin. */}
                      <span className="tabular text-muted ml-auto text-xs whitespace-nowrap">
                        {new Date(kayit.createdAt).toLocaleString('tr-TR')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/*
            ── KİŞİSEL · BUGÜN — F5'te geldi ───────────────────────────────

            ⚠️ BURADA "Henüz burada olmayan özet" BLOĞU VARDI ve "sağlık özeti —
            antrenman, ölçüm ve alışkanlık modülü yok" diyordu. F5 o modülleri
            yazdı; blok bırakılsaydı T-054f'te düzeltilen "Yedek durumu" metninin
            aynı sınıfı olurdu — var olmayan bir eksikliği şimdiki zamanda
            anlatmak. Dört özetin dördü de artık gerçek veriden.
          */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <CardTitle seviye="h2">Kişisel · bugün</CardTitle>

              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">Son ölçüm</dt>
                  <dd className="text-body text-sm">
                    {sonOlcum ? (
                      <>
                        <span className="tabular text-primary text-lg">
                          {olcuBicim(sonOlcum.weightKg, 'kg')}
                        </span>
                        <span className="text-muted block text-xs">
                          <span className="tabular">{sonOlcum.date}</span>
                          {sonOlcum.sleepHours && ` · uyku ${olcuBicim(sonOlcum.sleepHours, 'sa')}`}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">Henüz ölçüm yok.</span>
                    )}
                    <Link
                      href="/panel/saglik"
                      className="focus-ring link block w-fit rounded text-xs"
                    >
                      Sağlığa git
                    </Link>
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">Son antrenman</dt>
                  <dd className="text-body text-sm">
                    {sonAntrenman ? (
                      <>
                        <span className="text-primary text-lg">
                          {ANTRENMAN_TURU[sonAntrenman.type]}
                        </span>
                        <span className="text-muted block text-xs">
                          <span className="tabular">{sonAntrenman.date}</span> ·{' '}
                          <span className="tabular">{sonAntrenman.setCount}</span> set
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">Henüz antrenman yok.</span>
                    )}
                    <Link
                      href="/panel/spor"
                      className="focus-ring link block w-fit rounded text-xs"
                    >
                      Spora git
                    </Link>
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">Bugünün alışkanlıkları</dt>
                  <dd className="text-body text-sm">
                    {aliskanlik.habits.length > 0 ? (
                      <span className="tabular text-primary text-lg">
                        {bugunTamamlanan} / {aliskanlik.habits.length}
                      </span>
                    ) : (
                      <span className="text-muted">Aktif alışkanlık yok.</span>
                    )}
                    <Link
                      href="/panel/hayat"
                      className="focus-ring link block w-fit rounded text-xs"
                    >
                      Hayata git
                    </Link>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

/** Tek sayı + nereye gittiği. Sayı §3.2 gereği sekmeli rakam. */
function OzetKart({
  ikon: Ikon,
  etiket,
  deger,
  not,
  href,
  bagEtiketi,
}: {
  ikon: typeof Mail;
  etiket: string;
  deger: number;
  not: string;
  href: string;
  bagEtiketi: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          <Ikon className="text-muted size-4 shrink-0" aria-hidden="true" />
          <p className="text-muted text-xs">{etiket}</p>
        </div>

        <p className="tabular text-primary text-2xl font-medium">{deger}</p>
        <p className="text-muted text-xs">{not}</p>

        {/* Bağlantı GERÇEK bir sayfaya gidiyor — hepsi bu turdan önce yazıldı. */}
        <Link
          href={href}
          className="focus-ring link mt-1 self-start rounded text-xs"
          aria-label={`${etiket}: ${bagEtiketi}`}
        >
          {bagEtiketi}
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard finans kutusu — tutar DİZEDEN basılıyor.
 *
 * `paraBicim` `Number()`a hiç dokunmuyor (ADR-014/D); bu sayfada grafik yok,
 * yani dönüşüme gerek de yok. Not `<dd>`nin İÇİNDE — T-104'te ölçülen
 * `definition-list` kusurunun aynısı tekrarlanmasın.
 */
function FinansKutu({ etiket, tutar, renk }: { etiket: string; tutar: string; renk: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs">{etiket}</dt>
      <dd className={`tabular text-lg ${renk}`}>{paraBicim(tutar, Currency.TRY)}</dd>
    </div>
  );
}
