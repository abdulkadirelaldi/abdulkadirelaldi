import type { Metadata } from 'next';

import { DilSekmeleri } from '@/components/panel/dil-sekmeleri';
import { panelDili } from '@/components/panel/icerik-gorunumleri';
import { ProfilFormu } from '@/components/panel/profil-formu';
import { Topbar } from '@/components/panel/topbar';
import { VARSAYILAN_DIL } from '@/i18n/diller';
import { fetchProfile, findProfileSnapshot } from '@/server/services/profile';

export const metadata: Metadata = {
  title: 'Profil',
  robots: { index: false, follow: false, nocache: true },
};

const TABAN = '/panel/icerik/profil';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/panel/icerik/profil` — §4.2.
 *
 * TEK ROTA: liste yok, `[id]` yok, `yeni` yok. `Profile` dil başına tekil kayıt
 * (ADR-017); hangi satırın düzenlendiğini adresteki `?dil=` söylüyor (ADR-046),
 * kimlik değil.
 *
 * `fetchProfile` (ham, önbeleksiz) okunuyor — `getProfile` public tarafın
 * önbellekli okuması.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * YOKLUK DİLE GÖRE FARKLI ANLAM TAŞIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * TÜRKÇE satır seed ile açılıyor; yoksa servis FIRLATIYOR (seed uyarısıyla) ve
 * bu doğru: hata `(panel)/error.tsx`e düşüyor ve mesajı seed komutunu söylüyor.
 *
 * EN/DE satırı ise henüz YAZILMAMIŞ bir çeviri — kurulum hatası değil. Form boş
 * başlıyor ve ilk kayıt `saveProfileAction`ın dile göre `upsert`iyle satırı
 * açıyor. Fırlatmak, çeviriyi başlatmanın tek yolunu kapatmak olurdu.
 */
export default async function ProfilYonetimiPage({ searchParams }: SayfaProps) {
  const dil = panelDili((await searchParams).dil);
  const profil = dil === VARSAYILAN_DIL ? await fetchProfile(dil) : await findProfileSnapshot(dil);

  return (
    <>
      <Topbar title="Profil" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <DilSekmeleri taban={TABAN} aktif={dil} />

          {/*
            `key` ŞART: sekmeler aynı sayfanın adresini değiştiriyor ve Next
            bileşeni yeniden kullanıyor. Form varsayılanları yalnızca İLK
            render'da okunduğu için anahtarsız hâlde İngilizce sekmede Türkçe
            metin kalır — ve "Kaydet" onu İngilizce satıra yazardı.
          */}
          <ProfilFormu key={dil} profil={profil} dil={dil} />
        </div>
      </main>
    </>
  );
}
