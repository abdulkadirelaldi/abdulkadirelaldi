import { KATEGORI_BASLIK } from '@/components/public/yetenek-kategori';
import { KayanSerit } from '@/components/public/tasarim/kayan-serit';
import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { ParlakGlif, ParlakKup } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import type { SkillDto } from '@/server/services/content-dto';

export type YeteneklerProps = {
  yetenekler: SkillDto[];
};

/** Bundan azında kayan şerit seyrek görünüyor; düz ızgaraya düşülüyor. */
const SERIT_ESIGI = 6;

function YetenekKarti({ yetenek }: { yetenek: SkillDto }) {
  return (
    <article className="border-line-hover bg-surface mx-2 flex w-72 shrink-0 flex-col gap-5 rounded-[1.5rem] border p-5 md:w-80">
      <div className="flex items-center justify-between gap-3">
        <span className="tabular text-muted text-[0.68rem] tracking-[0.14em] uppercase">
          {KATEGORI_BASLIK[yetenek.category]}
        </span>
        <span className="tabular text-primary text-xs">{yetenek.level}%</span>
      </div>
      <h3 className="text-primary font-display text-xl font-bold">{yetenek.name}</h3>
      {/* Seviye çubuğu SÜS: sayı hemen yukarıda metin olarak var. */}
      <div aria-hidden="true" className="bg-elevated h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-gradient-vurgu h-full rounded-full"
          style={{ width: `${yetenek.level}%` }}
        />
      </div>
    </article>
  );
}

/**
 * ADR-045 — "Neyle çalışıyorum" (örnekteki "What Clients Are Saying").
 *
 * Örnekte müşteri yorumları var; veritabanında yorum YOK ve uydurma yorum
 * yazılmaz (kullanıcı kararı, 2026-10-21). Aynı görünüm — iki sıra, ters
 * yönlerde kayan kartlar — gerçek yetenek verisiyle.
 *
 * Kayan şeridin ikinci kopyası `aria-hidden` + `inert` (KayanSerit); her kart
 * ekran okuyucuya bir kez okunuyor.
 */
export function Yetenekler({ yetenekler }: YeteneklerProps) {
  if (yetenekler.length === 0) return null;

  const sirali = [...yetenekler].sort((a, b) => a.order - b.order);
  const ust = sirali.filter((_, i) => i % 2 === 0);
  const alt = sirali.filter((_, i) => i % 2 === 1);

  return (
    <section
      id="yetenekler"
      aria-labelledby="yetenekler-baslik"
      className="relative isolate overflow-hidden pt-24 pb-32 md:pt-32 md:pb-44"
    >
      <Yuzen hiz={-140} className="top-24 right-[6%] w-16 md:w-24">
        <ParlakKup className="w-full" />
      </Yuzen>
      <Yuzen hiz={-80} gecikme={0.8} className="bottom-24 left-[4%] w-20 md:w-28">
        <ParlakGlif glif="#" className="text-[5rem] md:text-[7rem]" />
      </Yuzen>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <KonturBaslik
          id="yetenekler-baslik"
          metin="Neyle çalışıyorum"
          className="mx-auto max-w-5xl text-center text-[clamp(2.1rem,7vw,6.5rem)]"
        />
      </div>

      {sirali.length < SERIT_ESIGI ? (
        <ul className="mx-auto mt-16 flex max-w-7xl flex-wrap justify-center gap-y-4 px-4 md:px-8">
          {sirali.map((y) => (
            <li key={y.id}>
              <YetenekKarti yetenek={y} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-16 flex flex-col gap-4 md:mt-20">
          <KayanSerit sure={55} durdur etiket="Yetenekler — birinci sıra">
            {ust.map((y) => (
              <YetenekKarti key={y.id} yetenek={y} />
            ))}
          </KayanSerit>
          <KayanSerit sure={60} ters durdur etiket="Yetenekler — ikinci sıra">
            {alt.map((y) => (
              <YetenekKarti key={y.id} yetenek={y} />
            ))}
          </KayanSerit>
        </div>
      )}
    </section>
  );
}
