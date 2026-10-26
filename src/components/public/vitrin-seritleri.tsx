import { KayanSerit } from '@/components/public/tasarim/kayan-serit';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import { cn } from '@/lib/utils/cn';

/** T-117 — bundan az logo sitede gösterilmez (tek logo "müşteri listesi" değildir). */
export const LOGO_ESIGI = 3;

export type MusteriLogosu = { id: string; name: string; logo: { id: string } };

/**
 * Müşteri logoları — örnekteki hero altı logo şeridi.
 *
 * Logolar TEK RENGE (beyaz) çevriliyor: farklı markaların renkleri yan yana
 * gürültü yapar; örnekteki gibi tek tonlu sıra sakin ve "kurumsal" duruyor.
 * Logo dosyaları T-117 izniyle public (`isPublicClientLogo`).
 */
export function LogoSeridi({
  logolar,
  etiket,
  className,
}: {
  logolar: MusteriLogosu[];
  /** Ekran okuyucu bölge adı — dile göre (ADR-046). */
  etiket: string;
  className?: string;
}) {
  if (logolar.length < LOGO_ESIGI) return null;
  return (
    <KayanSerit sure={35} durdur etiket={etiket} className={className}>
      {logolar.map((m) => (
        <div key={m.id} className="flex h-16 w-44 shrink-0 items-center justify-center px-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- aynı kökenli dosya ucu (ADR-044), kapak-gorsel.tsx ile aynı gerekçe */}
          <img
            src={dosyaAdresi(m.logo.id)}
            alt={m.name}
            title={m.name}
            loading="lazy"
            decoding="async"
            className="max-h-9 w-auto opacity-70 brightness-0 invert transition-opacity hover:opacity-100"
          />
        </div>
      ))}
    </KayanSerit>
  );
}

/**
 * Teknoloji şeridi — dev, dolu/kontur dönüşümlü kelimeler ve ✦ ayraçları.
 * Yazılımcı imzası.
 */
export function TeknolojiSeridi({ kelimeler, etiket }: { kelimeler: string[]; etiket: string }) {
  if (kelimeler.length === 0) return null;
  return (
    <KayanSerit sure={Math.max(30, kelimeler.length * 5)} etiket={etiket}>
      {kelimeler.map((kelime, i) => (
        <span key={kelime} className="flex shrink-0 items-center">
          <span
            className={cn(
              'dev-baslik px-6 text-[clamp(2.5rem,7vw,6rem)] whitespace-nowrap',
              i % 2 === 0 ? 'text-primary' : 'metin-kontur',
            )}
          >
            {kelime}
          </span>
          <span aria-hidden="true" className="text-gradient-vurgu text-4xl">
            ✦
          </span>
        </span>
      ))}
    </KayanSerit>
  );
}

/*
 * Kapak şeridi (iki sıra kayan proje görseli) 2026-10-26'da sahibinin isteğiyle
 * KALDIRILDI — görseller proje kartlarında ve detay sayfalarında duruyor.
 */
