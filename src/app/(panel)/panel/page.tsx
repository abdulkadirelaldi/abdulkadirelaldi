import { Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import { Topbar } from '@/components/panel/topbar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Panel',
  /* §8.7 — sayfa düzeyinde de `noindex`; middleware başlığına ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * T-002 YER TUTUCU — panel iskeletinin (Sidebar + Topbar) render olduğunu ve
 * §3.2 sekmeli rakam kuralının çalıştığını kanıtlar.
 *
 * Gerçek dashboard (aylık gelir/gider, aktif işler, bugünün planı, sağlık özeti)
 * T-030'da veri katmanı hazır olunca yazılacak.
 */
export default function PanelDashboardPlaceholder() {
  return (
    <>
      <Topbar title="Panel" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">T-002 yer tutucu</Badge>
            <p className="text-muted text-sm">
              Dashboard verisi T-030&apos;da bağlanacak. Aşağısı yalnızca iskelet doğrulaması.
            </p>
          </div>

          {/* Sekmeli rakam kontrolü — sütunlar hizalı mı? (§3.2) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Bu ay gelir', value: '48.250,00' },
              { label: 'Bu ay gider', value: '11.907,50' },
              { label: 'Aktif iş', value: '3' },
              { label: 'Okunmamış mesaj', value: '11' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex flex-col gap-1 p-5">
                  <p className="text-muted text-xs">{stat.label}</p>
                  <p className="tabular text-primary text-2xl font-medium">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle seviye="h2">Yükleniyor durumu</CardTitle>
                  <CardDescription>
                    İskelet, yerine geçeceği içerikle aynı ölçüyü tutar — sayfa zıplamaz.
                  </CardDescription>
                </div>

                <div className="flex flex-col gap-3" aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <Skeleton className="rounded-pill size-10" />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <EmptyState
              icon={Wallet}
              title="Bu ay henüz işlem yok"
              description="İlk gelir veya gideri girdiğinde aylık özet burada canlanacak."
              action={
                <button type="button" className={buttonClasses({ size: 'sm' })}>
                  İşlem ekle
                </button>
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}
