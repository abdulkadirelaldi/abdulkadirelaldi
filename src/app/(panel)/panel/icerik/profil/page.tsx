import type { Metadata } from 'next';

import { ProfilFormu } from '@/components/panel/profil-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchProfile } from '@/server/services/profile';

export const metadata: Metadata = {
  title: 'Profil',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/icerik/profil` — §4.2.
 *
 * TEK ROTA: liste yok, `[id]` yok, `yeni` yok. `Profile` dil başına tekil kayıt
 * (ADR-017) ve seed ile açılıyor; "hangi kaydı düzenliyorum" sorusu yok, o
 * yüzden adres de parametre taşımıyor.
 *
 * `fetchProfile` (ham, önbeleksiz) okunuyor — `getProfile` public tarafın
 * önbellekli okuması. Kayıt yoksa servis FIRLATIYOR (seed uyarısıyla) ve bu
 * doğru: panelde boş bir form göstermek, var olmayan bir kaydı düzenliyormuş
 * gibi hissettirirdi. Hata `(panel)/error.tsx`e düşüyor ve mesajı seed
 * komutunu söylüyor.
 */
export default async function ProfilYonetimiPage() {
  const profil = await fetchProfile();

  return (
    <>
      <Topbar title="Profil" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <ProfilFormu profil={profil} />
        </div>
      </main>
    </>
  );
}
