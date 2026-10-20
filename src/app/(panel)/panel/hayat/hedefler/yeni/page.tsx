import type { Metadata } from 'next';

import { HedefFormu } from '@/components/panel/hedef-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni hedef',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/hayat/hedefler/yeni` — okuma yok; yazma `createGoalAction`. */
export default function YeniHedefPage() {
  return (
    <>
      <Topbar title="Yeni hedef" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HedefFormu />
        </div>
      </main>
    </>
  );
}
