import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import { Basarilar } from '@/components/public/basarilar';
import { Hakkimda } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { IletisimBlogu } from '@/components/public/iletisim';
import { TembelIletisimFormu } from '@/components/public/tembel-iletisim-formu';
import { Projeler } from '@/components/public/projeler';
import { Yetenekler } from '@/components/public/yetenekler';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { SITE_NAME } from '@/lib/constants';
import { ExperienceType } from '@/types';
import {
  getExperience,
  getFeaturedProjects,
  getProfile,
  getSiteStats,
  getSkills,
} from '@/server/services';

/**
 * Hero'daki başlıca yetenekler — sahibinin öne çıkardığı alanlar (2026-10-23).
 * Ad listesi burada, VERİ yetenek kayıtlarında: kaydı silinen ad hero'dan da
 * düşer, uydurma bir yetenek görünmez. Adlar teknoloji adı, dile göre değişmiyor.
 */
const HERO_YETENEKLERI = ['STM32 (HAL)', 'CAN Bus', 'Python', 'TypeScript', 'Next.js', 'YOLO'];

/**
 * HERO AVATARI — `public/avatar-kucuk.webp` (192×192 kare, ~8 KB) varsa künye
 * kartında küçük, yuvarlak; yoksa baş harfler. Dosya sistemi MODÜL
 * YÜKLENİRKEN bir kez okunur: dosya yalnızca yeni bir dağıtımla değişir.
 * Standalone imaj `public/`u kopyalıyor.
 */
const avatar = existsSync(join(process.cwd(), 'public', 'avatar-kucuk.webp'))
  ? '/avatar-kucuk.webp'
  : null;

export function anaSayfaMetadata(dil: Dil): Metadata {
  const s = sozluk(dil);
  return {
    title: { absolute: `${SITE_NAME} — ${s.site.unvan}` },
    description: s.site.anaSayfaAciklama,
    ...dilAlternatifleri(dil, 'anasayfa'),
  };
}

/**
 * Ana sayfa — ADR-046: dile duyarlı ortak modül. Türkçe rota (`/`) ve önekli
 * diller (`/en`, `/de`) aynı bileşeni çağırır; içerik o dilin kayıtlarından.
 */
export async function AnaSayfa({ dil }: { dil: Dil }) {
  const s = sozluk(dil);
  const [profil, yetenekler, projeler, istatistikler, deneyimler] = await Promise.all([
    getProfile(dil),
    getSkills(dil),
    getFeaturedProjects(dil),
    getSiteStats(dil),
    getExperience(dil),
  ]);
  const oduller = deneyimler.filter((d) => d.type === ExperienceType.AWARD);

  return (
    <>
      <Hero
        dil={dil}
        profil={profil}
        ad={SITE_NAME}
        avatar={avatar}
        yetenekler={HERO_YETENEKLERI.filter((ad) => yetenekler.some((y) => y.name === ad)).map(
          (ad) => ad.replace(' (HAL)', ''),
        )}
        // Süren işler — kartta "Şu an". Kurumun açıklama kuyruğu kesiliyor; çevirilerde
        // ayraç uzun tire ya da kısa tire olabildiği için ikisi de (Almanca ` – `).
        simdi={deneyimler
          .filter((d) => d.type === ExperienceType.WORK && d.current)
          .slice(0, 3)
          .map((d) => `${d.organization.split(/\s[—–-]\s/)[0]} · ${d.role}`)}
      />

      <Hakkimda
        dil={dil}
        profil={profil}
        istatistikler={istatistikler}
        odulSayisi={oduller.length}
      />

      {/* Sıra işe alımcının sorusuna göre: ne yaptı (projeler) → ne kazandı
          (başarılar) → neyle çalışıyor (yetenekler). Hizmetler ana sayfada YOK
          (2026-10-26) — kendi sayfasında. */}
      <Projeler dil={dil} projeler={projeler} />

      <Basarilar dil={dil} oduller={oduller} />

      <Yetenekler dil={dil} yetenekler={yetenekler} />

      <IletisimBlogu
        dil={dil}
        profil={profil}
        form={
          <TembelIletisimFormu
            eposta={profil.socials?.email ?? null}
            metin={s.form}
            dil={dil}
            kaynakSayfa={yol(dil, 'anasayfa')}
          />
        }
      />
    </>
  );
}
