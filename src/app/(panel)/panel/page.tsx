import { FolderOpen, Mail, ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EYLEM_ETIKET, EYLEM_VARYANT } from '@/components/panel/denetim-gorunumleri';
import { Topbar } from '@/components/panel/topbar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { fetchAuditLog } from '@/server/services/audit-log';
import { fetchContactMessages } from '@/server/services/contact-message';
import { fetchSiteStats } from '@/server/services/stats';

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
 * özeti. DÖRDÜNDEN ÜÇÜ bugün türetilemiyor — finans, iş ve sağlık servisleri
 * yazılmadı (F4/F5). İki kolay ve iki yanlış seçenek vardı:
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
  const [istatistik, mesajlar, denetim] = await Promise.all([
    fetchSiteStats({}),
    /*
      `unreadCount` FİLTREDEN BAĞIMSIZ geliyor (T-038), o yüzden `perPage: 1`
      yeterli: satırlara ihtiyaç yok, yalnızca sayaca. Satır istemek 25 mesajı
      boşuna okumak olurdu.
    */
    fetchContactMessages({ page: 1, perPage: 1 }),
    fetchAuditLog({ page: 1, perPage: SON_DENETIM_SAYISI, sort: 'desc' }),
  ]);

  return (
    <>
      <Topbar title="Panel" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          {/* ── BUGÜN TÜRETİLEBİLEN ──────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-3">
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

          {/* ── HENÜZ TÜRETİLEMEYEN — BOŞ KART DEĞİL, TEK BLOK ───────────── */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <CardTitle seviye="h2">Henüz burada olmayan üç özet</CardTitle>

              <p className="text-muted text-sm">
                §4.2 bu sayfada dört özet daha tanımlıyor; üçü için gereken veri katmanı henüz
                yazılmadı ve bu yüzden kartları da yok:
              </p>

              <ul className="text-muted flex flex-col gap-1.5 text-sm">
                <li>
                  <span className="text-body">Aylık gelir/gider</span> — finans modülü (işlem,
                  kategori, yinelenen ödeme) yok.
                </li>
                <li>
                  <span className="text-body">Aktif işler ve bugünün planı</span> — iş ve müşteri
                  modülü yok.
                </li>
                <li>
                  <span className="text-body">Sağlık özeti</span> — antrenman, ölçüm ve alışkanlık
                  modülü yok.
                </li>
              </ul>

              {/*
                "YAKINDA" DEMİYOR ve bu bilinçli: tarihini bilmediğim bir söz
                vermek, T-034'te panelde "410 dönüyor" yazıp sonra ölçüp geri
                almak zorunda kaldığım hatanın aynı sınıfı. Cümle bir OLGU:
                modüller yazıldığında kartlar eklenecek.
              */}
              <p className="text-muted text-sm">
                Modüller yazıldığında kartlar buraya eklenecek. O zamana kadar bu sayfada uydurma
                bir sayı göstermemeyi tercih ediyoruz — panelin söylediği her sayı gerçek.
              </p>
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
