import type { Metadata } from 'next';

import { IletisimBlogu } from '@/components/public/iletisim';
import { IletisimFormu } from '@/components/public/iletisim-formu';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { getProfile } from '@/server/services';

export function iletisimMetadata(dil: Dil): Metadata {
  const m = sozluk(dil).sayfaBaslik.iletisim;
  return { title: m.baslik, description: m.metaAciklama, ...dilAlternatifleri(dil, 'iletisim') };
}

/**
 * /iletisim — §4.1.
 *
 * SUNUCU BİLEŞENİ; tek istemci yaprağı `IletisimFormu` (doğrulama için gerekli).
 *
 * YALNIZCA DOLU ALANLAR KART ÜRETİR (T-022 kalıbı): `location` ve
 * `availability` `null` olabilir; boş bir kart bilgi vermez, yer kaplar.
 */
export async function IletisimSayfasi({ dil }: { dil: Dil }) {
  const s = sozluk(dil);
  const profil = await getProfile(dil);

  return (
    <>
      <SayfaBasligi
        baslik={s.sayfaBaslik.iletisim.baslik}
        aciklama={s.sayfaBaslik.iletisim.aciklama}
      />
      {/* Ana sayfayla AYNI blok (ADR-045); başlığı burada `h2` — sayfa `h1`'i yukarıda. */}
      <IletisimBlogu
        dil={dil}
        profil={profil}
        form={
          <IletisimFormu
            eposta={profil.socials?.email ?? null}
            metin={s.form}
            dil={dil}
            kaynakSayfa={yol(dil, 'iletisim')}
          />
        }
      />
    </>
  );
}
