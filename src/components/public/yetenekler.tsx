import { BolumGiris } from '@/components/public/bolum-giris';
import { Bolum } from '@/components/public/tasarim/bolum';
import type { Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import type { SkillDto } from '@/server/services/content-dto';

export type YeteneklerProps = {
  dil: Dil;
  yetenekler: SkillDto[];
};

/**
 * "Neyle çalışıyorum" — kategori satırları (2026-10-27: tablo düzeni).
 *
 * KATEGORİYE GÖRE SABİT (2026-10-26): önceden iki sıra kayan karttı.
 * Kayan şerit bir yeteneği okumak için beklemeyi gerektiriyor, sayfadaki
 * hareketi de fazlalaştırıyordu (teknoloji şeridi, yığın kartlar…). İşe alımcı
 * "C biliyor mu?" sorusunu tek bakışta yanıtlayabilmeli. Kategori sırası
 * yeteneklerin `order` sırasından — diller ve gömülü önde.
 *
 * Seviye (0–100) BİLEREK gösterilmiyor: kendine verilen yüzde bir ölçüm
 * değil, ziyaretçiye kesinlik iddiası gibi okunur.
 */
export function Yetenekler({ dil, yetenekler }: YeteneklerProps) {
  const sz = sozluk(dil);
  const s = sz.yeteneklerBolum;
  if (yetenekler.length === 0) return null;

  const gruplar = new Map<SkillDto['category'], SkillDto[]>();
  for (const y of [...yetenekler].sort((a, b) => a.order - b.order)) {
    gruplar.set(y.category, [...(gruplar.get(y.category) ?? []), y]);
  }

  return (
    <Bolum id="yetenekler" baslik={s.baslik}>
      {/* Tablo gibi satırlar: solda kategori, sağda yetenekler. */}
      <dl className="border-line border-t">
        {[...gruplar].map(([kategori, liste], sira) => (
          <BolumGiris
            key={kategori}
            gecikme={sira * 0.04}
            className="border-line grid gap-3 border-b py-5 md:grid-cols-[14rem_1fr] md:gap-8"
          >
            <dt className="text-primary text-sm font-semibold">{sz.kategori[kategori]}</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {liste.map((y) => (
                  <li
                    key={y.id}
                    className="border-line bg-canvas text-body hover:border-accent hover:text-accent rounded-md border px-2.5 py-1 text-sm transition-colors duration-200"
                  >
                    {y.name}
                  </li>
                ))}
              </ul>
            </dd>
          </BolumGiris>
        ))}
      </dl>
    </Bolum>
  );
}
