import { Briefcase, GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CvIndir } from '@/components/public/cv-indir';
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Hakkımda</p>

        {/*
          Sayfadaki TEK <h1> ve İSİM taşıyor, ünvan değil. Ünvanı başlık yapmak
          ("Full Stack Developer") arama sonucunda ve sekme başlığında sayfanın
          KİM hakkında olduğunu söylemez; bu sayfanın konusu kişinin kendisi.
          Bölüm başlıkları <h2>, kayıt başlıkları <h3>.
        */}
        <h1 className="text-3xl md:text-5xl">{SITE_NAME}</h1>

        <p className="text-accent-soft text-lg font-medium">{profil.headline}</p>

        {profil.subtitle && <p className="text-body max-w-2xl text-lg">{profil.subtitle}</p>}
      </header>

      {paragraflar.length > 0 && (
        <section aria-labelledby="biyografi-baslik" className="flex flex-col gap-4">
          <h2 id="biyografi-baslik" className="text-2xl">
            Kısaca ben
          </h2>

          {paragraflar.map((paragraf) => (
            <p key={paragraf.slice(0, 32)} className="text-body max-w-2xl">
              {paragraf}
            </p>
          ))}
        </section>
      )}

      <section aria-labelledby="deneyim-baslik" className="flex flex-col gap-6">
        <h2 id="deneyim-baslik" className="text-2xl">
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

      <section aria-labelledby="egitim-baslik" className="flex flex-col gap-6">
        <h2 id="egitim-baslik" className="text-2xl">
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

      <section aria-labelledby="cv-baslik" className="flex flex-col gap-6">
        <h2 id="cv-baslik" className="text-2xl">
          Özgeçmiş
        </h2>

        {/*
          `indirmeUrl` BİLEREK verilmiyor: `AttachmentRefDto` imzalı URL taşımıyor
          (ADR-018) ve üretimi T-037'de gelecek. O gün buraya tek bir prop
          eklenecek; bileşenin üç durumu zaten hazır.
        */}
        <CvIndir cv={profil.cv} />
      </section>
    </div>
  );
}
