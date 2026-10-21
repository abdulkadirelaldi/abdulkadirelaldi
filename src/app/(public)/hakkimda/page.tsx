import { Briefcase, GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import Link from 'next/link';

import { OdulIzgarasi } from '@/components/public/basarilar';
import { CvIndir } from '@/components/public/cv-indir';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { ParlakGlif, ParlakKure } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { ZamanCizelgesi } from '@/components/public/zaman-cizelgesi';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SITE_NAME } from '@/lib/constants';
import { ExperienceType } from '@/types';
import { getExperience, getProfile } from '@/server/services';

export const metadata: Metadata = {
  title: 'Hakkımda',
  description:
    'Kim olduğum, nasıl çalıştığım ve bugüne kadar nerelerde bulunduğum — deneyim ve eğitim geçmişiyle birlikte.',
};

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
export default async function HakkimdaSayfasi() {
  const [profil, deneyimler] = await Promise.all([getProfile(), getExperience()]);

  const paragraflar = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isler = deneyimler.filter((d) => d.type === ExperienceType.WORK);
  const egitim = deneyimler.filter((d) => d.type === ExperienceType.EDUCATION);
  const oduller = deneyimler.filter((d) => d.type === ExperienceType.AWARD);

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
        yol="~/hakkimda"
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
              01 — Kısaca ben
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
              Ödüller
            </h2>
            <OdulIzgarasi oduller={oduller} />
          </section>
        )}

        <section aria-labelledby="deneyim-baslik" className="flex flex-col gap-10">
          <h2
            id="deneyim-baslik"
            className="dev-baslik text-primary text-[clamp(2.25rem,7vw,5.5rem)]"
          >
            Deneyim
          </h2>
          {isler.length > 0 ? (
            <ZamanCizelgesi kayitlar={isler} />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Deneyim kayıtları hazırlanıyor"
              description="Çalışma geçmişimi buraya ekleyeceğim. Ne yaptığımı şimdiden konuşabiliriz."
              action={
                <Link href="/iletisim" className={buttonClasses({ size: 'sm' })}>
                  Bana yaz
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
            Eğitim
          </h2>
          {egitim.length > 0 ? (
            <ZamanCizelgesi kayitlar={egitim} />
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="Eğitim bilgisi henüz eklenmedi"
              description="Panelden eklendiğinde bu bölüm otomatik dolar."
            />
          )}
        </section>

        <section aria-labelledby="cv-baslik" className="flex flex-col gap-10">
          <h2 id="cv-baslik" className="dev-baslik text-primary text-[clamp(2.25rem,7vw,5.5rem)]">
            Özgeçmiş
          </h2>
          {/* Kalıcı, aynı kökenli adres (ADR-044) — T-037'nin öngördüğü "tek prop". */}
          <CvIndir cv={profil.cv} indirmeUrl={profil.cv ? dosyaAdresi(profil.cv.id) : null} />
        </section>
      </div>
    </>
  );
}
