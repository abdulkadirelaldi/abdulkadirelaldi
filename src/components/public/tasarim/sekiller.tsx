import { cn } from '@/lib/utils/cn';

/**
 * ADR-045 — dekoratif geometrik şekiller.
 *
 * HEPSİ SÜS: `aria-hidden`, odaklanamaz, metin taşımaz. Renkler `--sekil-*`
 * token'larından gelir (§3.1 hex yasağı). Sunucu bileşeni — JS göndermez.
 *
 * İki aile var:
 *   - DÜZ şekiller (alt bilgi şeridi): tek renk, keskin geometri.
 *   - PARLAK şekiller (yüzen süsler): radyal gradyanla "3B" hissi veren küre,
 *     küp, halka ve süslü parantez — yazılımcı dokunuşu.
 */

type SekilProps = { className?: string };

const ORTAK = { 'aria-hidden': true, focusable: false } as const;

/* ---------------------------------------------------------------- DÜZ ---- */

function Carpi({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <path
        d="M20 0 50 30 80 0 100 20 70 50 100 80 80 100 50 70 20 100 0 80 30 50 0 20Z"
        fill={renk}
      />
    </svg>
  );
}

function DortDaire({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <circle cx="27" cy="27" r="25" fill={renk} />
      <circle cx="73" cy="27" r="25" fill={renk} />
      <circle cx="27" cy="73" r="25" fill={renk} />
      <circle cx="73" cy="73" r="25" fill={renk} />
    </svg>
  );
}

function Hilal({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <path d="M0 0h30v50a20 20 0 0 0 40 0V0h30v50A50 50 0 0 1 0 50Z" fill={renk} />
    </svg>
  );
}

function Daire({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <circle cx="50" cy="50" r="50" fill={renk} />
    </svg>
  );
}

function Simsek({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <path d="M0 0h55L100 50 55 100H0l45-50Z" fill={renk} />
    </svg>
  );
}

function Papyon({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <path d="M0 0 50 40 100 0v100L50 60 0 100Z" fill={renk} />
    </svg>
  );
}

function Ucgen({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <path d="M50 0 100 50H0Z" fill={renk} />
      <path d="M50 100 100 50H0Z" fill={renk} opacity="0.55" />
    </svg>
  );
}

function Halka({ renk }: { renk: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className="h-full w-auto">
      <circle cx="50" cy="50" r="38" fill="none" stroke={renk} strokeWidth="24" />
    </svg>
  );
}

const SERIT = [
  { Sekil: Carpi, renk: 'var(--sekil-mor)' },
  { Sekil: DortDaire, renk: 'var(--sekil-yesil)' },
  { Sekil: Hilal, renk: 'var(--sekil-beyaz)' },
  { Sekil: Daire, renk: 'var(--sekil-mor)' },
  { Sekil: Simsek, renk: 'var(--sekil-beyaz)' },
  { Sekil: Papyon, renk: 'var(--sekil-turuncu)' },
  { Sekil: Ucgen, renk: 'var(--sekil-beyaz)' },
  { Sekil: Halka, renk: 'var(--sekil-pembe)' },
] as const;

/**
 * Alt bilginin renkli şekil şeridi. Her şekil üzerine gelince döner —
 * fareyle "oynanabilen" küçük bir an; dokunmatikte statik kalır.
 */
export function SekilSeridi({ className }: SekilProps) {
  return (
    <div aria-hidden="true" className={cn('grid grid-cols-8 items-center gap-2', className)}>
      {SERIT.map(({ Sekil, renk }, sira) => (
        <div
          key={sira}
          className="ease-brand flex aspect-square items-center justify-center transition-transform duration-700 hover:rotate-90"
        >
          <Sekil renk={renk} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- PARLAK ---- */

/** Parlak küre — iki renk arasında radyal gradyan + tepe parlaması. */
export function ParlakKure({
  className,
  renk = 'var(--sekil-mor)',
}: SekilProps & { renk?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block aspect-square rounded-full', className)}
      style={{
        backgroundImage: `radial-gradient(circle at 32% 28%, color-mix(in oklab, white 70%, ${renk}) 0%, ${renk} 38%, color-mix(in oklab, black 55%, ${renk}) 100%)`,
        boxShadow: `0 30px 60px -20px color-mix(in oklab, ${renk} 60%, transparent)`,
      }}
    />
  );
}

/** Parlak halka (simit) — iç boşluk maskeyle açılıyor. */
export function ParlakHalka({
  className,
  renk = 'var(--sekil-pembe)',
}: SekilProps & { renk?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block aspect-square rounded-full', className)}
      style={{
        backgroundImage: `radial-gradient(circle at 30% 25%, color-mix(in oklab, white 65%, ${renk}) 0%, ${renk} 35%, color-mix(in oklab, black 50%, ${renk}) 75%)`,
        mask: 'radial-gradient(circle, transparent 30%, black 31%)',
        WebkitMask: 'radial-gradient(circle, transparent 30%, black 31%)',
      }}
    />
  );
}

/**
 * Parlak süslü parantez / kod imi — yazılımcı imzası. Display fontuyla yazılmış
 * bir glif, gradyan dolgu ve gölgeyle "şişirilmiş" görünüyor.
 */
export function ParlakGlif({ className, glif = '{ }' }: SekilProps & { glif?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('font-dev block leading-none font-black select-none', className)}
      style={{
        backgroundImage:
          'linear-gradient(160deg, color-mix(in oklab, white 75%, var(--sekil-yesil)) 0%, var(--sekil-yesil) 45%, color-mix(in oklab, black 45%, var(--sekil-yesil)) 100%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        filter: 'drop-shadow(0 18px 24px color-mix(in oklab, var(--sekil-yesil) 35%, transparent))',
      }}
    >
      {glif}
    </span>
  );
}

/** Parlak küp — üç yüzü üç tonla, izometrik. */
export function ParlakKup({
  className,
  renk = 'var(--sekil-turuncu)',
}: SekilProps & { renk?: string }) {
  return (
    <svg viewBox="0 0 100 100" {...ORTAK} className={cn('block', className)}>
      <path d="M50 5 92 28 50 51 8 28Z" fill={`color-mix(in oklab, white 35%, ${renk})`} />
      <path d="M8 28 50 51v44L8 72Z" fill={renk} />
      <path d="M92 28 50 51v44l42-23Z" fill={`color-mix(in oklab, black 35%, ${renk})`} />
    </svg>
  );
}
