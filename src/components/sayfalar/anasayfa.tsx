import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import { Basarilar } from '@/components/public/basarilar';
import { Hakkimda } from '@/components/public/hakkimda';
import { Hero } from '@/components/public/hero';
import { IletisimBlogu } from '@/components/public/iletisim';
import { TembelIletisimFormu } from '@/components/public/tembel-iletisim-formu';
import { Projeler } from '@/components/public/projeler';
import { LogoSeridi, TeknolojiSeridi } from '@/components/public/vitrin-seritleri';
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
  getSiteClientLogos,
  getSiteStats,
  getSkills,
} from '@/server/services';

/** Ana sayfadaki yetenek şeridine giren kayıt sayısı (tam liste /cv'de). */

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */

/**
 * HERO AVATARI — `public/avatar-kucuk.webp` (192×192 kare, ~8 KB) varsa
 * kod penceresinin başlığında küçük, yuvarlak; yoksa baş harfler. Dosya
 * sistemi MODÜL YÜKLENİRKEN bir kez okunur: dosya yalnızca yeni bir
 * dağıtımla değişir. Standalone imaj `public/`u kopyalıyor.
 */
/**
 * Hero'daki başlıca yetenekler — sahibinin öne çıkardığı alanlar (2026-10-23).
 * Ad listesi burada, VERİ yetenek kayıtlarında: kaydı silinen ad hero'dan da
 * düşer, uydurma bir yetenek görünmez. Adlar teknoloji adı, dile göre değişmiyor.
 */
const HERO_YETENEKLERI = ['STM32 (HAL)', 'CAN Bus', 'Python', 'TypeScript', 'Next.js', 'YOLO'];

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
  const [profil, yetenekler, projeler, istatistikler, logolar, deneyimler] =
    await Promise.all([
      getProfile(dil),
      getSkills(dil),
      getFeaturedProjects(dil),
      getSiteStats(dil),
      getSiteClientLogos(),
      getExperience(dil),
    ]);
  const oduller = deneyimler.filter((d) => d.type === ExperienceType.AWARD);

  // Teknoloji şeridi: projelerde gerçekten KULLANILAN yığın önce, sonra yetenekler.
  const teknolojiler = [
    ...new Set([...projeler.flatMap((p) => p.stack), ...yetenekler.map((y) => y.name)]),
  ].slice(0, 12);

  return (
    <>
      <Hero
        dil={dil}
        profil={profil}
        ad={SITE_NAME}
        avatar={avatar}
        // Süren işler — pencerede `şimdi`. Kurumun açıklama kuyruğu kesiliyor; çevirilerde
        // ayraç uzun tire ya da kısa tire olabildiği için ikisi de (Almanca ` – `).
        yetenekler={HERO_YETENEKLERI.filter((ad) => yetenekler.some((y) => y.name === ad)).map(
          (ad) => ad.replace(' (HAL)', ''),
        )}
        simdi={deneyimler
          .filter((d) => d.type === ExperienceType.WORK && d.current)
          .slice(0, 3)
          .map((d) => `${d.organization.split(/\s[—–-]\s/)[0]} · ${d.role}`)}
      />

      <div className="flex flex-col gap-10 py-10 md:gap-14 md:py-14">
        <LogoSeridi logolar={logolar} etiket={s.seritler.ekipler} />
        <TeknolojiSeridi kelimeler={teknolojiler} etiket={s.seritler.teknolojiler} />
      </div>

      <Hakkimda
        dil={dil}
        profil={profil}
        istatistikler={istatistikler}
        odulSayisi={oduller.length}
      />

      <Basarilar dil={dil} oduller={oduller} />

      {/* Hizmetler bölümü 2026-10-26'da ana sayfadan KALDIRILDI: iş başvurusu için
          gelen okuyucuya "zaten kendi işini yapıyor" izlenimi veriyordu. Hizmetler
          kendi sayfasında (/hizmetler) ve menüde duruyor. */}
      <Projeler dil={dil} projeler={projeler} />

      {/* Tüm yetenekler, kategoriye göre gruplu (sabit ızgara — kayan şeritteki gibi
          HTML'de iki kez basılmıyor, sınır gerekmiyor). */}
      <Yetenekler
        dil={dil}
        yetenekler={yetenekler}
      />

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
