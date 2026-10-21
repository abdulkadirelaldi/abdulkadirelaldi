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
    <ol className="border-line border-t">
      {kayitlar.map((kayit) => (
        <li
          key={kayit.id}
          className="border-line group grid gap-x-8 gap-y-2 border-b py-8 md:grid-cols-[14rem_1fr_1.2fr]"
        >
          {/* ADR-045 — hizmet satırlarıyla aynı dil: tarih | rol + kurum | açıklama. */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular text-muted text-xs tracking-wider uppercase">
              {aralik(kayit.startDate, kayit.endDate, kayit.current)}
            </p>
            {kayit.current && <Badge variant="success">Devam ediyor</Badge>}
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-primary text-base font-bold tracking-[0.08em] uppercase">
              {kayit.role}
            </h3>
            <p className="text-accent-soft text-sm">{kayit.organization}</p>
          </div>
          {kayit.description && (
            <p className="text-body text-sm leading-relaxed">{kayit.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
