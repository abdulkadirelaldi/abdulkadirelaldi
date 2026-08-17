import { FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { aralik } from '@/components/public/gun-bicim';
import { KATEGORI_BASLIK } from '@/components/public/yetenek-kategori';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { YazdirDugmesi } from '@/components/public/yazdir-dugmesi';
import { getExperience, getProfile, getSkills } from '@/server/services';
import type { ExperienceDto, SkillDto } from '@/server/services/content-dto';
import { ExperienceType, SkillCategory } from '@/types';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'CV',
  description: 'Yazdırılabilir tek sayfalık özgeçmiş: deneyim, eğitim ve yetenekler.',
};

/** Kayıt bloğu — deneyim ve eğitim aynı biçimi paylaşıyor. */
function Kayit({ kayit }: { kayit: ExperienceDto }) {
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-primary text-sm font-semibold">
          {kayit.role} · <span className="font-normal">{kayit.organization}</span>
        </h3>
        <p className="tabular text-muted text-xs">
          {aralik(kayit.startDate, kayit.endDate, kayit.current)}
        </p>
      </div>
      {kayit.description && <p className="text-body text-xs">{kayit.description}</p>}
    </li>
  );
}

/**
 * /cv — §4.1, YAZDIRILABİLİR tek sayfa.
 *
 * SUNUCU BİLEŞENİ; tek istemci yaprağı `YazdirDugmesi`.
 *
 * YAZDIRMA SÖZLEŞMESİ: bu sayfa yalnızca (a) çıktıda görünmeyecek öğelere
 * `data-yazdirmada-gizle` koyar ve (b) kabına `yazdirma-sayfa` sınıfını verir.
 * Mürekkep paleti, kenar boşluğu, sayfa bölünmesi ve gizleme kuralı
 * `globals.css`'in `@media print` bloğunda — başka bir sayfa da yazdırılabilir
 * olacaksa aynı iki işareti koyması yetiyor, CSS kopyalanmıyor.
 *
 * TEK SAYFAYA SIĞMA: ölçüm PDF üretilerek yapıldı (Chromium, A4). Sığdıran
 * şey CSS hilesi değil, İÇERİK SEÇİMİ — burada özet, deneyim, eğitim ve
 * yetenekler var; ana sayfadaki hizmet/proje anlatıları yok. İçerik büyürse
 * (yeni deneyim kayıtları) sayfa ikiye çıkar; bu bir hata değil, ölçülüp
 * yeniden karar verilecek bir eşik (ADR-030'un seed sözleşmesiyle aynı mantık).
 *
 * BOŞ VERİ: her bölüm kendi verisi yoksa HİÇ render edilmiyor. Bir CV'de
 * "deneyim yok" başlığı bilgi değil, zarar.
 */
export default async function CvSayfasi() {
  const [profil, deneyimler, yetenekler] = await Promise.all([
    getProfile(),
    getExperience(),
    getSkills(),
  ]);

  const isler = deneyimler.filter((d) => d.type === ExperienceType.WORK);
  const egitim = deneyimler.filter((d) => d.type === ExperienceType.EDUCATION);

  /** Özet: biyografinin İLK paragrafı. Tamamı bir sayfaya sığmaz, /hakkimda'da duruyor. */
  const ozet = profil.bio.split(/\n\s*\n/)[0]?.trim();

  const gruplar = (Object.keys(KATEGORI_BASLIK) as SkillCategory[])
    .map((kategori) => ({
      kategori,
      liste: yetenekler
        .filter((y: SkillDto) => y.category === kategori)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.liste.length > 0);

  const eposta = profil.socials?.email;

  /** Başlık dışında gösterilecek hiçbir şey kalmadı mı. */
  const bosSayfa = !ozet && isler.length === 0 && egitim.length === 0 && gruplar.length === 0;

  return (
    <div className="yazdirma-sayfa mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 md:py-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl">{SITE_NAME}</h1>
          <p className="text-accent-soft text-base font-medium">{profil.headline}</p>

          <p className="text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {eposta && <span>{eposta}</span>}
            {profil.location && <span>{profil.location}</span>}
            {profil.socials?.github && <span>{profil.socials.github}</span>}
            {profil.socials?.linkedin && <span>{profil.socials.linkedin}</span>}
          </p>
        </header>

        <YazdirDugmesi />
      </div>

      {/*
        HİÇBİR BÖLÜM YOKSA: başlıktan ibaret bir sayfa ziyaretçiye hiçbir şey
        söylemez. `data-yazdirmada-gizle` ile ÇIKTIDA görünmez — kâğıtta "içerik
        yok" yazmasının anlamı olmaz, ekranda ise bir sonraki adımı gösterir.
      */}
      {bosSayfa && (
        <div data-yazdirmada-gizle>
          <EmptyState
            icon={FileText}
            title="CV içeriği hazırlanıyor"
            description="Deneyim ve yetenek kayıtları girildiğinde bu sayfa kendiliğinden dolacak."
            action={
              <Link href="/hakkimda" className={buttonClasses({ size: 'sm' })}>
                Hakkımda sayfasına git
              </Link>
            }
          />
        </div>
      )}

      {ozet && (
        <section aria-labelledby="ozet-baslik" className="flex flex-col gap-1.5">
          <h2 id="ozet-baslik" className="border-line border-b pb-1 text-base">
            Özet
          </h2>
          <p className="text-body text-xs">{ozet}</p>
        </section>
      )}

      {isler.length > 0 && (
        <section aria-labelledby="cv-deneyim-baslik" className="flex flex-col gap-2">
          <h2 id="cv-deneyim-baslik" className="border-line border-b pb-1 text-base">
            Deneyim
          </h2>
          <ol className="flex flex-col gap-2.5">
            {isler.map((kayit) => (
              <Kayit key={kayit.id} kayit={kayit} />
            ))}
          </ol>
        </section>
      )}

      {egitim.length > 0 && (
        <section aria-labelledby="cv-egitim-baslik" className="flex flex-col gap-2">
          <h2 id="cv-egitim-baslik" className="border-line border-b pb-1 text-base">
            Eğitim
          </h2>
          <ol className="flex flex-col gap-2.5">
            {egitim.map((kayit) => (
              <Kayit key={kayit.id} kayit={kayit} />
            ))}
          </ol>
        </section>
      )}

      {gruplar.length > 0 && (
        <section aria-labelledby="cv-yetenek-baslik" className="flex flex-col gap-2">
          <h2 id="cv-yetenek-baslik" className="border-line border-b pb-1 text-base">
            Yetenekler
          </h2>
          {/*
            Rozet DEĞİL, virgüllü liste: 18 rozet kâğıtta üç satır kutu demek.
            Ekranda da aynı biçim duruyor — /cv'nin ekran hâli çıktının önizlemesi
            olsun, iki ayrı düzen bakılması gereken iki ayrı yer olurdu.
          */}
          <dl className="flex flex-col gap-1">
            {gruplar.map(({ kategori, liste }) => (
              <div key={kategori} className="flex flex-wrap gap-x-2 text-xs">
                <dt className="text-primary min-w-20 font-semibold">{KATEGORI_BASLIK[kategori]}</dt>
                <dd className="text-body flex-1">{liste.map((y) => y.name).join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
