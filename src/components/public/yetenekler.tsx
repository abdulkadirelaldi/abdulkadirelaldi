import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { ParlakGlif, ParlakKup } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import type { Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import type { SkillDto } from '@/server/services/content-dto';

export type YeteneklerProps = {
  dil: Dil;
  yetenekler: SkillDto[];
};

/**
 * ADR-045 — "Neyle çalışıyorum" (örnekteki "What Clients Are Saying").
 *
 * KATEGORİYE GÖRE SABİT IZGARA (2026-10-26): önceden iki sıra kayan karttı.
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
    <section
      id="yetenekler"
      aria-labelledby="yetenekler-baslik"
      className="relative isolate overflow-hidden pt-24 pb-32 md:pt-32 md:pb-44"
    >
      <Yuzen hiz={-140} className="top-24 right-[6%] w-16 md:w-24">
        <ParlakKup className="w-full" />
      </Yuzen>
      <Yuzen hiz={-80} gecikme={0.8} className="bottom-24 left-[4%] -z-10 w-20 md:w-28">
        <ParlakGlif glif="#" className="text-[5rem] md:text-[7rem]" />
      </Yuzen>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <KonturBaslik
          id="yetenekler-baslik"
          metin={s.baslik}
          className="mx-auto max-w-5xl text-center text-[clamp(2.1rem,7vw,6.5rem)]"
        />
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 md:mt-20 md:px-8 lg:grid-cols-3">
        {[...gruplar].map(([kategori, liste]) => (
          <section
            key={kategori}
            aria-label={sz.kategori[kategori]}
            className="border-line-hover bg-surface flex flex-col gap-4 rounded-[1.5rem] border p-6"
          >
            <h3 className="tabular text-accent-soft text-[0.72rem] tracking-[0.14em] uppercase">
              {sz.kategori[kategori]}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {liste.map((y) => (
                <li
                  key={y.id}
                  className="border-line text-primary rounded-full border px-3 py-1 text-sm"
                >
                  {y.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
