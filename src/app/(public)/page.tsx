import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import { Basarilar } from '@/components/public/basarilar';
import { Hakkimda } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { Hizmetler } from '@/components/public/hizmetler';
import { IletisimBlogu } from '@/components/public/iletisim';
import { TembelIletisimFormu } from '@/components/public/tembel-iletisim-formu';
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

/** Ana sayfadaki yetenek şeridine giren kayıt sayısı (tam liste /cv'de). */
const ANA_SAYFA_YETENEK = 24;

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

/**
 * 3B AVATAR — `public/` altına bu adlardan biriyle konduğu an hero'da görünür
 * (ilk bulunan kazanır). Yoksa hero parlak küre süsünü çizer. Dosya sistemi
 * MODÜL YÜKLENİRKEN bir kez okunur: her istekte `existsSync` gereksiz, dosya
 * yalnızca yeni bir dağıtımla değişir. Standalone imaj `public/`u kopyalıyor.
 */
const AVATAR_ADAYLARI = ['avatar-3d.webp', 'avatar-3d.png'] as const;
const publicteVar = (ad: string) => existsSync(join(process.cwd(), 'public', ad));
const avatar = (() => {
  const bulunan = AVATAR_ADAYLARI.find(publicteVar);
  if (!bulunan) return null;
  // Küçük kopya (`avatar-3d-720.webp`) varsa mobil onu indirir — LCP öğesi bu
  // görsel, mobilde bayt sayısı doğrudan LCP'ye yazılıyor (ADR-045 ölçümü).
  const kucuk = bulunan === 'avatar-3d.webp' && publicteVar('avatar-3d-720.webp');
  return {
    src: `/${bulunan}`,
    srcSet: kucuk ? '/avatar-3d-720.webp 720w, /avatar-3d.webp 900w' : undefined,
  };
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
      <Hero profil={profil} ad={SITE_NAME} avatar={avatar} />

      <div className="flex flex-col gap-10 py-10 md:gap-14 md:py-14">
        <LogoSeridi logolar={logolar} />
        <TeknolojiSeridi kelimeler={teknolojiler} />
        <KapakSeridi projeler={projeler} />
      </div>

      <Hakkimda profil={profil} istatistikler={istatistikler} />

      <Basarilar oduller={oduller} />

      <Hizmetler hizmetler={hizmetler} kiyiMedyaUrl={KIYI_MEDYA_URL} />

      <Projeler projeler={projeler} />

      {/* Ana sayfada ilk 24 (sıraya göre — diller, gömülü, yapay zeka önde); tam liste
          /cv'de. Kayan şerit içeriği HTML'de iki kez basıyor: 44 kart, mobil LCP
          benzetimine yazılan belge baytını boşuna şişiriyordu (ADR-045). */}
      <Yetenekler
        yetenekler={[...yetenekler].sort((a, b) => a.order - b.order).slice(0, ANA_SAYFA_YETENEK)}
      />

      <IletisimBlogu
        profil={profil}
        form={<TembelIletisimFormu eposta={profil.socials?.email ?? null} />}
      />
    </>
  );
}
