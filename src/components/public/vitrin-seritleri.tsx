import { dosyaAdresi } from '@/lib/dosya-adresi';
import { cn } from '@/lib/utils/cn';

/** T-117 — bundan az logo sitede gösterilmez (tek logo "müşteri listesi" değildir). */
export const LOGO_ESIGI = 3;

export type MusteriLogosu = { id: string; name: string; logo: { id: string } };

/**
 * Müşteri logoları — sabit, ortalanmış sıra (2026-10-27: kayan şerit kaldırıldı).
 *
 * Logolar GRİ TONDA: farklı markaların renkleri yan yana gürültü yapar; tek
 * tonlu sıra sakin ve kurumsal duruyor.
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
    <ul
      aria-label={etiket}
      className={cn('flex flex-wrap items-center justify-center gap-x-10 gap-y-6', className)}
    >
      {logolar.map((m) => (
        <li key={m.id} className="flex h-12 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- aynı kökenli dosya ucu (ADR-044), kapak-gorsel.tsx ile aynı gerekçe */}
          <img
            src={dosyaAdresi(m.logo.id)}
            alt={m.name}
            title={m.name}
            loading="lazy"
            decoding="async"
            className="max-h-9 w-auto opacity-70 grayscale transition-opacity hover:opacity-100"
          />
        </li>
      ))}
    </ul>
  );
}
