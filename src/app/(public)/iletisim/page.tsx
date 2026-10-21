import type { Metadata } from 'next';

import { IletisimBlogu } from '@/components/public/iletisim';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { ParlakGlif } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { getProfile } from '@/server/services';

export const metadata: Metadata = {
  title: 'İletişim',
  description:
    'Bir fikrin varsa yaz: e-posta, sosyal hesaplar veya iletişim formu. Genelde bir gün içinde dönüyorum.',
};

/**
 * /iletisim — §4.1.
 *
 * SUNUCU BİLEŞENİ; tek istemci yaprağı `IletisimFormu` (doğrulama için gerekli).
 *
 * YALNIZCA DOLU ALANLAR KART ÜRETİR (T-022 kalıbı): `location` ve
 * `availability` `null` olabilir; boş bir kart bilgi vermez, yer kaplar.
 */
export default async function IletisimSayfasi() {
  const profil = await getProfile();

  return (
    <>
      <SayfaBasligi
        baslik="İletişim"
        yol="~/iletisim"
        aciklama="Bir fikrin, bir işin ya da bir sorun mu var? Formu doldur ya da doğrudan e-posta at."
        susler={
          <Yuzen hiz={-120} className="top-32 right-[6%] w-20 md:w-32">
            <ParlakGlif glif="@" className="text-[5rem] md:text-[8rem]" />
          </Yuzen>
        }
      />
      {/* Ana sayfayla AYNI blok (ADR-045); başlığı burada `h2` — sayfa `h1`'i yukarıda. */}
      <IletisimBlogu profil={profil} katman={10} />
    </>
  );
}
