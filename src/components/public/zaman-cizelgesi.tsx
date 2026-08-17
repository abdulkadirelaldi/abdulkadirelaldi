import { Badge } from '@/components/ui/badge';
import { aralik } from '@/components/public/gun-bicim';
import type { ExperienceDto } from '@/server/services/content-dto';

/**
 * Deneyim / eğitim zaman çizelgesi — §4.1 (/hakkimda).
 *
 * SUNUCU BİLEŞENİ: durum, olay ve efekt yok. `BolumGiris` ile sarmalanmıyor —
 * ana sayfadaki bölümlerin aksine burası sayfanın ANA İÇERİĞİ; giriş animasyonu
 * için görünürlük beklemek, içeriği okumaya gelen kullanıcıyı bekletmek olurdu.
 *
 * SIRALAMA çağıranın işi değil: servis `startDate desc` veriyor, burada da
 * aynı sıra korunuyor — en yeni üstte.
 *
 * `<ol>` KULLANILIYOR: kronolojik sıra bilginin parçası, `<ul>` bunu söylemez.
 */
export function ZamanCizelgesi({ kayitlar }: { kayitlar: ExperienceDto[] }) {
  return (
    <ol className="flex flex-col">
      {kayitlar.map((kayit) => (
        <li
          key={kayit.id}
          className="border-line relative flex flex-col gap-1.5 border-l py-5 pl-6 last:border-l-transparent last:pb-0"
        >
          {/*
            Nokta çizginin ÜSTÜNE biniyor (-left ile yarım kaydırma). `aria-hidden`
            değil, hiç metin taşımıyor — dekoratif olduğu için ekran okuyucuya
            zaten görünmez.
          */}
          <span
            className="bg-accent-soft ring-canvas absolute top-6.5 -left-[5px] size-2.5 rounded-full ring-4"
            aria-hidden="true"
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="tabular text-muted text-xs tracking-wider uppercase">
              {aralik(kayit.startDate, kayit.endDate, kayit.current)}
            </p>
            {kayit.current && <Badge variant="success">Devam ediyor</Badge>}
          </div>

          <h3 className="text-primary text-base font-semibold">{kayit.role}</h3>
          <p className="text-accent-soft text-sm">{kayit.organization}</p>

          {kayit.description && (
            <p className="text-body mt-1 max-w-2xl text-sm">{kayit.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
