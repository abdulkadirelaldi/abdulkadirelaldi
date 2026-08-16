import type { Metadata } from 'next';

import { Hakkimda } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { Hizmetler } from '@/components/public/hizmetler';
import { Iletisim } from '@/components/public/iletisim';
import { Projeler } from '@/components/public/projeler';
import { Yetenekler } from '@/components/public/yetenekler';
import { SITE_NAME } from '@/lib/constants';
import {
  getFeaturedProjects,
  getProfile,
  getServices,
  getSiteStats,
  getSkills,
} from '@/server/services';

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

/** RotatingText ifadeleri — `ProfileDto`'da çoklu ünvan alanı yok. */
const UNVANLAR = ['Yazılım Mühendisi', 'Full Stack Developer', 'Ürün Odaklı Geliştirici'] as const;

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
  const [profil, yetenekler, projeler, hizmetler, istatistikler] = await Promise.all([
    getProfile(),
    getSkills(),
    getFeaturedProjects(),
    getServices(),
    getSiteStats(),
  ]);

  return (
    <>
      <Hero profil={profil} ad={SITE_NAME} unvanlar={[...UNVANLAR]} />

      <Hakkimda profil={profil} istatistikler={istatistikler} />

      <Yetenekler yetenekler={yetenekler} />

      <Projeler projeler={projeler} />

      <Hizmetler hizmetler={hizmetler} kiyiMedyaUrl={KIYI_MEDYA_URL} />

      <Iletisim profil={profil} />
    </>
  );
}
