import type { Metadata } from 'next';

import {
  GECICI_HIZMETLER,
  GECICI_PROFIL,
  GECICI_PROJELER,
  GECICI_YETENEKLER,
} from '@/components/public/fixture';
import { Hakkimda, type Istatistik } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { Hizmetler } from '@/components/public/hizmetler';
import { Iletisim } from '@/components/public/iletisim';
import { Projeler } from '@/components/public/projeler';
import { Yetenekler } from '@/components/public/yetenekler';
import { SITE_NAME } from '@/lib/constants';

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

/** RotatingText ifadeleri — `ProfileDto`'da çoklu ünvan alanı yok. */
const UNVANLAR = ['Yazılım Mühendisi', 'Full Stack Developer', 'Ürün Odaklı Geliştirici'] as const;

/**
 * İstatistiklerin KAYNAĞI HENÜZ KARARA BAĞLANMADI (T-000 / ENGEL-3).
 * `ProfileDto` böyle bir alan taşımıyor; `Profile.stats` mı eklenecek yoksa
 * `Project`/`Client` sayımından mı türetilecek, Orkestra Şefi'nde.
 */
const ISTATISTIKLER: Istatistik[] = [
  { deger: 2, sonek: '+', etiket: 'yıl deneyim' },
  { deger: 18, etiket: 'tamamlanan proje' },
  { deger: 12, etiket: 'mutlu müşteri' },
];

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — Yazılım Mühendisi`,
  },
  description:
    'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum. Projeler, hizmetler ve iletişim.',
};

/**
 * Ana sayfa — §4.1. Bu görevde ilk üç bölüm: Hero, Hakkımda, Yetenekler.
 * Projeler / Hizmetler / İletişim T-022'de eklenecek.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERİ: ŞU AN YER TUTUCU — ADR-026'nın beklediği yer burası
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-026 sayfaların GERÇEK VERİDEN okumasını söylüyor ve geçici verinin
 * Backend'in DTO tiplerinden TÜRETİLMESİNİ şart koşuyor. T-030 tipleri bu görev
 * sırasında yayımladı (`src/server/services/content-dto.ts`); bölümler artık
 * doğrudan `ProfileDto` ve `SkillDto` alıyor.
 *
 * İçerik geçici olarak `fixture.ts`'ten geliyor ve o dosya tipleri Backend'den
 * TÜRETİYOR (elle kopya değil) — sözleşme değişirse `pnpm typecheck` kırılır.
 * Servisler (`fetchProfile` / `fetchSkills`) bağlanınca fixture silinecek.
 *
 * SERVİSLER gelince bu sayfa iki satırla bağlanır ve `fixture.ts` SİLİNİR:
 *
 *   const profil = await fetchProfile();   // önbelleklenmiş servis (ADR-011)
 *   const skills = await fetchSkills();
 *
 * Bu dosya Sunucu Bileşeni olarak KALMALI: veri çağrıları önbelleklenebilir
 * sınırın içinde kalsın, istemciye taşınmasın (ADR-011).
 */

export default function AnaSayfa() {
  return (
    <>
      <Hero profil={GECICI_PROFIL} ad={SITE_NAME} unvanlar={[...UNVANLAR]} />

      <Hakkimda profil={GECICI_PROFIL} istatistikler={[...ISTATISTIKLER]} />

      <Yetenekler yetenekler={GECICI_YETENEKLER} />

      <Projeler projeler={GECICI_PROJELER} />

      <Hizmetler hizmetler={GECICI_HIZMETLER} kiyiMedyaUrl={KIYI_MEDYA_URL} />

      <Iletisim profil={GECICI_PROFIL} />
    </>
  );
}
