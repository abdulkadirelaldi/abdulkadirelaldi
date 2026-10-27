import { Briefcase, GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import Link from 'next/link';

import { OdulIzgarasi } from '@/components/public/basarilar';
import { SertifikaListesi } from '@/components/public/sertifikalar';
import { Spor } from '@/components/public/spor';
import { CvIndir } from '@/components/public/cv-indir';
import { URETILMIS_CV } from '@/components/public/uretilmis-cv';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
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
        aciklama={
          <>
            <span className="text-primary font-semibold">{profil.headline}</span>
            {profil.subtitle && <> — {profil.subtitle}</>}
          </>
        }
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pt-12 pb-24 md:gap-20 md:px-8">
        {ilk && (
          <section
            aria-labelledby="biyografi-baslik"
            className="grid gap-8 md:grid-cols-[14rem_1fr]"
          >
            <h2 id="biyografi-baslik" className="text-muted text-sm font-medium">
              {h.kisaca}
            </h2>
            <div className="flex flex-col gap-6">
              <p className="text-primary text-xl leading-relaxed font-medium md:text-2xl">{ilk}</p>
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
            <h2 id="oduller-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
              {h.oduller}
            </h2>
            <OdulIzgarasi oduller={oduller} />
          </section>
        )}

        <section aria-labelledby="deneyim-baslik" className="flex flex-col gap-10">
          <h2 id="deneyim-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
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
          <h2 id="egitim-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
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
            <h2 id="sertifika-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
              {h.sertifikalar}
            </h2>
            <SertifikaListesi sertifikalar={sertifikalar} dil={dil} />
          </section>
        )}

        {/* Spor — kayıt yoksa bölüm yok. Dereceler kronolojik (spor.tsx notu). */}
        {spor.length > 0 && (
          <section aria-labelledby="spor-baslik" className="flex flex-col gap-10">
            <h2 id="spor-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
              {h.spor}
            </h2>
            <Spor
              kayitlar={spor}
              metin={{ dereceler: h.sporDereceler, takimlar: h.sporTakimlar }}
            />
          </section>
        )}

        <section aria-labelledby="cv-baslik" className="flex flex-col gap-10">
          <h2 id="cv-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
            {h.ozgecmis}
          </h2>
          {/* Kalıcı, aynı kökenli adres (ADR-044) — T-037'nin öngördüğü "tek prop". */}
          <CvIndir
            dil={dil}
            cv={profil.cv}
            indirmeUrl={profil.cv ? dosyaAdresi(profil.cv.id) : null}
            uretilmisPdf={URETILMIS_CV[dil]}
          />
        </section>
      </div>
    </>
  );
}
