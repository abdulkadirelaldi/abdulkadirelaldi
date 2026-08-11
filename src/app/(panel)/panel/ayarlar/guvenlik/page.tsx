import type { Metadata } from 'next';

import { TotpSetup } from '@/components/auth/totp-setup';
import { Topbar } from '@/components/panel/topbar';
import {
  confirmTotpSetup,
  getTotpStatus,
  regenerateBackupCodes,
  startTotpSetup,
} from '@/server/actions/totp';
import { auth } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Güvenlik',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * §4.2 — `/panel/ayarlar` altında güvenlik sekmesi.
 *
 * Sunucu Bileşeni: durumu okur, Server Action referanslarını istemci bileşenine
 * geçirir. `TotpSetup` eylemleri prop olarak alır (T-036/K6) — bu yüzden
 * Backend'in eylemleri gelince bileşende hiçbir değişiklik gerekmedi.
 *
 * `getTotpStatus()` bilinçli olarak HATA FIRLATMAZ: oturum yoksa ya da veritabanı
 * düşerse `{ enabled: false }` döner. Sunucu bileşeninde `try/catch` gerekmiyor;
 * sayfa zaten ara katmanla korunuyor (§8.5) ve her eylem kendi `auth()`
 * kontrolünü ayrıca yapıyor (§8.6).
 */
export default async function GuvenlikAyarlariPage() {
  const [session, status] = await Promise.all([auth(), getTotpStatus()]);

  return (
    <>
      <Topbar title="Güvenlik" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-2xl flex-col gap-6">
          <TotpSetup
            status={status}
            accountLabel={session?.user?.email ?? 'panel hesabı'}
            actions={{ startTotpSetup, confirmTotpSetup, regenerateBackupCodes }}
          />
        </div>
      </main>
    </>
  );
}
