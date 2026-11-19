'use client';

import { List } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { teslimMetni } from '@/lib/gorev/bicim';
import type { DikkatDurumu, Dukkan, Sokak } from '@/lib/gorev/sokak';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';

/** Dikkat durumlarının adı ve rengi. Renk tek başına taşımaz: her yerde yazısı da var. */
const DIKKAT: Record<DikkatDurumu, { ad: string; metin: string; nokta: string; zemin: string }> = {
  gecikmis: {
    ad: 'Gecikmiş',
    metin: 'text-danger',
    nokta: 'bg-danger',
    zemin: 'bg-danger/12 text-danger',
  },
  bugun: {
    ad: 'Bugün',
    metin: 'text-accent-soft',
    nokta: 'bg-accent-soft',
    zemin: 'bg-accent-soft/14 text-accent-soft',
  },
  yakin: {
    ad: 'Yakında · 2 gün',
    metin: 'text-warning',
    nokta: 'bg-warning',
    zemin: 'bg-warning/14 text-warning',
  },
};
const DIKKAT_SIRASI: readonly DikkatDurumu[] = ['gecikmis', 'bugun', 'yakin'];

/** Tente: dükkânın renginde çizgili şerit — tek süs, kimliği o taşır. */
const tente = (renk: string, adim = 16) => ({
  background: `repeating-linear-gradient(90deg, ${renk} 0 ${adim}px, transparent ${adim}px ${adim * 2}px)`,
});

function rozetMetni(d: Dukkan): string {
  if (d.durum === 'gecikmis') return `${d.sayi.gecikmis} gecikmiş`;
  if (d.durum === 'bugun') return `bugün ${d.sayi.bugun}`;
  return 'yakında';
}

/**
 * SOKAK EKRANI (ADR-057). Üstte dikkat panosu (gecikmiş · bugün · 2 gün içinde), altta iki sokak:
 * Kıyı Caddesi'nde her müşteri bir dükkân, arka sokakta ofis, okul, takım ve ev. Dükkâna dokunmak
 * onun işlerine girer. "Yalnızca dikkat isteyenler" sakin dükkânları soldurur, yerlerini değiştirmez.
 */
export function SokakEkrani({ sokak, bugun }: { sokak: Sokak; bugun: AppDay }) {
  const [suz, setSuz] = useState(false);

  const dukkanKarti = (d: Dukkan) => {
    const sakin = d.durum === null;
    return (
      <li key={d.anahtar} className={cn('transition-opacity', suz && sakin && 'opacity-30')}>
        <Link
          href={d.href}
          aria-label={`${d.ad} — ${d.acik} açık iş${d.durum ? `, ${rozetMetni(d)}` : ''}`}
          className={cn(
            'focus-ring bg-surface group flex h-full flex-col overflow-hidden rounded-xl border',
            'transition-[transform,border-color] duration-150 hover:-translate-y-0.5',
            d.durum === 'gecikmis' ? 'border-danger/45' : 'border-line hover:border-line-hover',
          )}
        >
          <span aria-hidden="true" className="h-3 opacity-80" style={tente(d.renk)} />
          <span className="flex flex-col gap-3 px-4 pt-3.5">
            <span className="flex items-center justify-between gap-2">
              <span className="text-primary truncate text-base font-semibold">{d.ad}</span>
              {d.durum ? (
                <span
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    DIKKAT[d.durum].zemin,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', DIKKAT[d.durum].nokta)}
                  />
                  {rozetMetni(d)}
                </span>
              ) : (
                <span className="text-muted shrink-0 text-xs">{d.tur}</span>
              )}
            </span>
            <span className="border-line bg-canvas flex min-h-16 flex-col justify-center gap-1.5 rounded-lg border px-3 py-2.5">
              {d.vitrin.length === 0 ? (
                <span className="text-muted text-xs">Vitrin boş</span>
              ) : (
                d.vitrin.map((g) => {
                  const t = teslimMetni(g, bugun);
                  return (
                    <span key={g.id} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-body truncate">{g.baslik}</span>
                      {t.metin && (
                        <span
                          className={cn(
                            'shrink-0',
                            t.durum === 'gecikti' ? 'text-danger' : 'text-muted',
                          )}
                        >
                          {t.metin}
                        </span>
                      )}
                    </span>
                  );
                })
              )}
            </span>
          </span>
          <span className="mt-auto flex items-end justify-between gap-2 px-4 pt-3">
            <span className="flex flex-col gap-0.5 pb-3">
              <span className="text-primary text-sm">
                {d.acik > 0 ? `${d.acik} açık iş` : 'Her şey bitti'}
              </span>
              {d.biten > 0 && <span className="text-muted text-xs">bu hafta {d.biten} bitti</span>}
            </span>
            {/* Kapı: gecikmiş işi olan dükkânın kapısı yanar. */}
            <span
              aria-hidden="true"
              className={cn(
                'border-line-hover h-9 w-7 rounded-t-md border border-b-0',
                d.durum === 'gecikmis' ? 'bg-danger/20' : 'bg-elevated',
              )}
            />
          </span>
        </Link>
      </li>
    );
  };

  const sokakBolumu = (id: string, ad: string, alt: string, dukkanlar: Dukkan[]) => (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3 px-1">
        <h2 id={id} className="text-body text-sm font-semibold">
          {ad}
        </h2>
        <span className="text-muted text-xs">{alt}</span>
      </div>
      {dukkanlar.length === 0 ? (
        <p className="rounded-card border-line-hover text-muted border border-dashed p-6 text-center text-sm">
          Henüz dükkân yok. Kıyı Medya işine müşteri adını etiket olarak yazınca dükkânı açılır.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dukkanlar.map(dukkanKarti)}
        </ul>
      )}
      <div
        aria-hidden="true"
        className="mt-2 h-px"
        style={{
          background:
            'repeating-linear-gradient(90deg, var(--border-hover) 0 14px, transparent 14px 26px)',
        }}
      />
    </section>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="text-primary font-semibold">{sokak.toplamAcik}</span> açık iş
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={suz}
            onClick={() => setSuz((s) => !s)}
            className={cn(
              'focus-ring flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm transition-colors',
              suz ? 'border-danger/50 bg-danger/10 text-primary' : 'border-line text-body',
            )}
          >
            <span aria-hidden="true" className="bg-danger size-2 rounded-full" />
            Yalnızca dikkat isteyenler
          </button>
          <Link
            href="/panel/isler?gorunum=liste"
            className="focus-ring border-line text-body flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm"
          >
            <List className="size-4" aria-hidden="true" />
            Liste
          </Link>
        </div>
      </div>

      <section aria-label="Dikkat panosu" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {DIKKAT_SIRASI.map((k) => {
          const isler = sokak.pano[k];
          return (
            <div
              key={k}
              className="border-line bg-surface flex flex-col rounded-xl border px-2 pt-3 pb-1.5"
            >
              <div className="flex items-center justify-between px-2 pb-2">
                <h2
                  className={cn('flex items-center gap-2 text-sm font-semibold', DIKKAT[k].metin)}
                >
                  <span aria-hidden="true" className={cn('size-2 rounded-full', DIKKAT[k].nokta)} />
                  {DIKKAT[k].ad}
                </h2>
                <span className="text-muted text-sm tabular-nums">{isler.length}</span>
              </div>
              {isler.length === 0 ? (
                <p className="border-line text-muted border-t px-2 py-3 text-sm">Yok, rahat.</p>
              ) : (
                <ul>
                  {isler.map((g) => (
                    <li key={g.id} className="border-line border-t">
                      <Link
                        href={g.href}
                        className="focus-ring hover:bg-elevated flex min-h-11 items-center gap-2.5 rounded-md px-2 py-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: g.renk }}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-primary truncate text-sm">{g.baslik}</span>
                          <span className="text-muted text-xs">
                            {g.yer} · {teslimMetni(g, bugun).metin}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {sokakBolumu('sokak-cadde', 'Kıyı Caddesi', 'Müşteri dükkânları', sokak.cadde)}
      {sokakBolumu('sokak-arka', 'Arka sokak', 'Ajans, okul, takım, ev', sokak.arka)}
    </div>
  );
}

/** Dükkânın içindeyken başlık: geri dönüş, tente, ad. */
export function DukkanBasligi({ ad, tur, renk }: { ad: string; tur: string; renk: string }) {
  // Aşağı kaydırılmış sokaktan girilince içerisi baştan görünsün (Next aynı rotada kaydırmıyor).
  useEffect(() => window.scrollTo(0, 0), [ad]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-1">
      <Link
        href="/panel/isler"
        className="focus-ring text-body hover:text-primary -ml-1 flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-1 text-sm"
      >
        <span aria-hidden="true">←</span> Sokağa dön
      </Link>
      <div className="border-line bg-surface overflow-hidden rounded-xl border">
        <div aria-hidden="true" className="h-3.5 opacity-80" style={tente(renk, 22)} />
        <div className="flex items-baseline justify-between gap-3 px-5 py-4">
          <h2 className="text-primary text-xl font-semibold">{ad}</h2>
          <span className="text-muted text-sm">{tur}</span>
        </div>
      </div>
    </div>
  );
}
