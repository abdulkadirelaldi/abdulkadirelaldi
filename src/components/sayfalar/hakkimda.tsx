import { Briefcase, GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import Link from 'next/link';

import { OdulIzgarasi } from '@/components/public/basarilar';
import { SertifikaListesi } from '@/components/public/sertifikalar';
import { Spor } from '@/components/public/spor';
import { CvIndir } from '@/components/public/cv-indir';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { ParlakGlif, ParlakKure } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { ZamanCizelgesi } from '@/components/public/zaman-cizelgesi';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SITE_NAME } from '@/lib/constants';
import { ExperienceType } from '@/types';
import { getExperience, getProfile } from '@/server/services';

export function hakkimdaMetadata(dil: Dil): Metadata {
  const m = sozluk(dil).sayfaBaslik.hakkimda;
  return {
    title: m.metaBaslik,
    description: m.metaAciklama,
    ...dilAlternatifleri(dil, 'hakkimda'),
  };
}

/**
 * /hakkimda — §4.1.
 *
 * SUNUCU BİLEŞENİ ve öyle kalmalı: iki okuma da önbelleklenebilir sınırın
 * içinde (ADR-011). Sayfada tek bir istemci bileşeni yok; ana sayfadaki
 * ölçümün (T-023) gösterdiği gibi, gerekmediği yerde istemci ağacı açmak
 * belgeyi büyütüp ilk boyamayı geciktiriyor.
 *
 * İKİ OKUMA PARALEL: aralarında bağımlılık yok.
 *
 * BOŞ VERİ: `getExperience` boş dizi döndürebilir (yeni kurulmuş site) —
 * iki grup da `EmptyState` gösterir, sayfa çökmez. `getProfile` ise ADR-017
 * gereği fırlatır; karşılığı `(public)/error.tsx`.
 */
export async function HakkimdaSayfasi({ dil }: { dil: Dil }) {
  const s = sozluk(dil);
  const h = s.hakkimdaSayfa;
  const [profil, deneyimler] = await Promise.all([getProfile(dil), getExperience(dil)]);

  const paragraflar = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isler = deneyimler.filter((d) => d.type === ExperienceType.WORK);
  const egitim = deneyimler.filter((d) => d.type === ExperienceType.EDUCATION);
  const oduller = deneyimler.filter((d) => d.type === ExperienceType.AWARD);
  const sertifikalar = deneyimler.filter((d) => d.type === ExperienceType.CERTIFICATE);
  const spor = deneyimler.filter((d) => d.type === ExperienceType.SPORT);

  const [ilk, ...diger] = paragraflar;

  return (
    <>
      {/*
        Sayfadaki TEK <h1> ve İSİM taşıyor, ünvan değil: arama sonucunda ve sekme
        başlığında sayfanın KİM hakkında olduğunu söylesin. Bölümler <h2>,
        kayıtlar <h3>.
      */}
      <SayfaBasligi
        baslik={SITE_NAME}
        yol={`~${yol(dil, 'hakkimda')}`}
        aciklama={
          <>
            <span className="text-primary font-semibold">{profil.headline}</span>
            {profil.subtitle && <> — {profil.subtitle}</>}
          </>
        }
        susler={
          <>
            <Yuzen hiz={-140} className="top-28 right-[5%] w-20 md:w-32">
              <ParlakGlif glif="{ }" className="text-[4.5rem] md:text-[7rem]" />
            </Yuzen>
            <Yuzen hiz={-90} gecikme={1} className="right-[28%] bottom-4 hidden w-16 md:block">
              <ParlakKure className="w-full" renk="var(--sekil-pembe)" />
            </Yuzen>
          </>
        }
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-4 pb-32 md:gap-32 md:px-8">
        {ilk && (
          <section
            aria-labelledby="biyografi-baslik"
            className="grid gap-8 md:grid-cols-[14rem_1fr]"
          >
            <h2
              id="biyografi-baslik"
              className="tabular text-muted text-xs font-normal tracking-[0.16em] uppercase"
            >
              {h.kisaca}
            </h2>
            <div className="flex flex-col gap-6">
              <p className="text-primary text-2xl leading-snug font-medium text-balance md:text-4xl">
                {ilk}
              </p>
              {diger.map((paragraf) => (
                <p key={paragraf.slice(0, 32)} className="text-body max-w-3xl md:text-lg">
                  {paragraf}
                </p>
              ))}
            </div>
          </section>
        )}

        {oduller.length > 0 && (
          <section aria-labelledby="oduller-baslik" className="flex flex-col gap-10">
            <h2
              id="oduller-baslik"
              className="dev-baslik text-gradient-vurgu text-[clamp(2.25rem,7vw,5.5rem)]"
            >
              {h.oduller}
            </h2>
            <OdulIzgarasi oduller={oduller} />
          </section>
        )}

        <section aria-labelledby="deneyim-baslik" className="flex flex-col gap-10">
          <h2
            id="deneyim-baslik"
            className="dev-baslik text-primary text-[clamp(2.25rem,7vw,5.5rem)]"
          >
            {h.deneyim}
          </h2>
          {isler.length > 0 ? (
            <ZamanCizelgesi kayitlar={isler} dil={dil} devamEdiyor={h.devamEdiyor} />
          ) : (
            <EmptyState
              icon={Briefcase}
              title={h.bosDeneyim}
              description={h.bosDeneyimAciklama}
              action={
                <Link href={yol(dil, 'iletisim')} className={buttonClasses({ size: 'sm' })}>
                  {s.liste.banaYaz}
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="egitim-baslik" className="flex flex-col gap-10">
          <h2
            id="egitim-baslik"
            className="dev-baslik metin-kontur text-[clamp(2.25rem,7vw,5.5rem)]"
          >
            {h.egitim}
          </h2>
          {egitim.length > 0 ? (
            <ZamanCizelgesi kayitlar={egitim} dil={dil} devamEdiyor={h.devamEdiyor} />
          ) : (
            <EmptyState
              icon={GraduationCap}
              title={h.bosEgitim}
              description={h.bosEgitimAciklama}
            />
          )}
        </section>

        {/* Sertifikalar — kayıt yoksa bölüm HİÇ yok (boş başlık bilgi değil). */}
        {sertifikalar.length > 0 && (
          <section aria-labelledby="sertifika-baslik" className="flex flex-col gap-10">
            <h2
              id="sertifika-baslik"
              className="dev-baslik text-primary text-[clamp(2.25rem,7vw,5.5rem)]"
            >
              {h.sertifikalar}
            </h2>
            <SertifikaListesi sertifikalar={sertifikalar} dil={dil} />
          </section>
        )}

        {/* Spor — kayıt yoksa bölüm yok. Dereceler kronolojik (spor.tsx notu). */}
        {spor.length > 0 && (
          <section aria-labelledby="spor-baslik" className="flex flex-col gap-10">
            <h2
              id="spor-baslik"
              className="dev-baslik metin-kontur text-[clamp(2.25rem,7vw,5.5rem)]"
            >
              {h.spor}
            </h2>
            <Spor
              kayitlar={spor}
              metin={{ dereceler: h.sporDereceler, takimlar: h.sporTakimlar }}
            />
          </section>
        )}

        <section aria-labelledby="cv-baslik" className="flex flex-col gap-10">
          <h2 id="cv-baslik" className="dev-baslik text-primary text-[clamp(2.25rem,7vw,5.5rem)]">
            {h.ozgecmis}
          </h2>
          {/* Kalıcı, aynı kökenli adres (ADR-044) — T-037'nin öngördüğü "tek prop". */}
          <CvIndir
            dil={dil}
            cv={profil.cv}
            indirmeUrl={profil.cv ? dosyaAdresi(profil.cv.id) : null}
          />
        </section>
      </div>
    </>
  );
}
