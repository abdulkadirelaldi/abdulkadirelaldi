import type { Metadata } from 'next';

import { BildirimAyarlari } from '@/components/panel/bildirim-ayarlari';
import { Topbar } from '@/components/panel/topbar';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { vapidAyarlari } from '@/server/services/bildirim';

export const metadata: Metadata = {
  title: 'Bildirimler',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/ayarlar/bildirimler` — push aboneliği ve bildirim türleri (2026-10-30). */
export default async function BildirimlerPage() {
  const session = await auth();
  const tercih = session?.user?.id
    ? await db.bildirimTercihi.findUnique({ where: { userId: session.user.id } })
    : null;

  return (
    <>
      <Topbar title="Bildirimler" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <BildirimAyarlari
            vapidAnahtari={vapidAyarlari()?.publicKey ?? null}
            tercih={{
              borc: tercih?.borc ?? true,
              aliskanlik: tercih?.aliskanlik ?? true,
              su: tercih?.su ?? true,
            }}
          />
        </div>
      </main>
    </>
  );
}
