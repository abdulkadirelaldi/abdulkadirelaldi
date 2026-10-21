import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import { Basarilar } from '@/components/public/basarilar';
import { Hakkimda } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { Hizmetler } from '@/components/public/hizmetler';
import { IletisimBlogu } from '@/components/public/iletisim';
import { Projeler } from '@/components/public/projeler';
import { KapakSeridi, LogoSeridi, TeknolojiSeridi } from '@/components/public/vitrin-seritleri';
import { Yetenekler } from '@/components/public/yetenekler';
import { SITE_NAME } from '@/lib/constants';
import { ExperienceType } from '@/types';
import {
  getExperience,
  getFeaturedProjects,
  getProfile,
  getServices,
  getSiteClientLogos,
  getSiteStats,
  getSkills,
} from '@/server/services';

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

/**
 * 3B AVATAR — `public/` altına bu adlardan biriyle konduğu an hero'da görünür
 * (ilk bulunan kazanır). Yoksa hero parlak küre süsünü çizer. Dosya sistemi
 * MODÜL YÜKLENİRKEN bir kez okunur: her istekte `existsSync` gereksiz, dosya
 * yalnızca yeni bir dağıtımla değişir. Standalone imaj `public/`u kopyalıyor.
 */
const AVATAR_ADAYLARI = ['avatar-3d.webp', 'avatar-3d.png'] as const;
const avatarAdresi = (() => {
  const bulunan = AVATAR_ADAYLARI.find((ad) => existsSync(join(process.cwd(), 'public', ad)));
  return bulunan ? `/${bulunan}` : null;
})();

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — Yazılım Mühendisi`,
  },
  description:
    'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum. Projeler, hizmetler ve iletişim.',
};

/**
 * Ana sayfa — §4.1, altı bölüm.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERİ: GERÇEK SERVİSLER (ADR-026) — fixture KALDIRILDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Beş okumanın hepsi `@/server/services`'in ÖNBELLEKLİ sürümleri (ADR-011):
 * `getProfile` = `cachedRead(fetchProfile)`. Ham `fetch*` sürümleri BURADA
 * KULLANILMAZ — onlar önbelleksizdir ve her ziyaret veritabanına giderdi.
 *
 * BU DOSYA SUNUCU BİLEŞENİ OLARAK KALMALI: okumalar önbelleklenebilir sınırın
 * içinde kalsın, istemciye taşınmasın. Bölüm bileşenleri `'use client'` ama
 * veriyi prop olarak alıyor; hiçbiri kendi başına veri çekmiyor.
 *
 * `Promise.all` SIRALI DEĞİL PARALEL: beşi arka arkaya `await` edilseydi
 * gecikmeler toplanırdı (ölçüm: sıralı ~5×RTT, paralel ~1×RTT). Aralarında
 * bağımlılık yok, sıraya girmeleri için sebep de yok.
 *
 * BOŞ VERİTABANI: `getSkills` / `getFeaturedProjects` / `getServices` boş dizi
 * döner ve bölümler `EmptyState` gösterir; `getSiteStats` sıfır döner ve kart
 * hiç çizilmez (bkz. `hakkimda.tsx`). `getProfile` İSE FIRLATIR — profil
 * ADR-017'de tekil, seed ile açılan bir kayıt; yokluğu boş durum değil kurulum
 * hatasıdır. Bu bilinçli davranışın kullanıcıya dönük yüzü `error.tsx`.
 */
export default async function AnaSayfa() {
  const [profil, yetenekler, projeler, hizmetler, istatistikler, logolar, deneyimler] =
    await Promise.all([
      getProfile(),
      getSkills(),
      getFeaturedProjects(),
      getServices(),
      getSiteStats(),
      getSiteClientLogos(),
      getExperience(),
    ]);
  const oduller = deneyimler.filter((d) => d.type === ExperienceType.AWARD);

  // Teknoloji şeridi: projelerde gerçekten KULLANILAN yığın önce, sonra yetenekler.
  const teknolojiler = [
    ...new Set([...projeler.flatMap((p) => p.stack), ...yetenekler.map((y) => y.name)]),
  ].slice(0, 12);

  return (
    <>
      <Hero profil={profil} ad={SITE_NAME} avatar={avatarAdresi} />

      <div className="flex flex-col gap-10 py-10 md:gap-14 md:py-14">
        <LogoSeridi logolar={logolar} />
        <TeknolojiSeridi kelimeler={teknolojiler} />
        <KapakSeridi projeler={projeler} />
      </div>

      <Hakkimda profil={profil} istatistikler={istatistikler} />

      <Basarilar oduller={oduller} />

      <Hizmetler hizmetler={hizmetler} kiyiMedyaUrl={KIYI_MEDYA_URL} />

      <Projeler projeler={projeler} />

      <Yetenekler yetenekler={yetenekler} />

      <IletisimBlogu profil={profil} />
    </>
  );
}
