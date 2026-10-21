import { cn } from '@/lib/utils/cn';

export type HarfHarfProps = {
  metin: string;
  /** İlk harfin gecikmesi (sn). */
  baslangic?: number;
  /** Harfler arası gecikme (sn). */
  aralik?: number;
  className?: string;
};

/**
 * ADR-045 — harflerin maskenin altından tek tek yükseldiği giriş.
 *
 * SAF CSS (`animate-harf-yuksel`): sunucuda çizilir, JS beklemez — hero
 * başlığı LCP adayı ve hidrasyonu beklerse ilk boyama gecikir. Her harf kendi
 * `overflow: hidden` kabında; yükselirken kabın altından görünür oluyor.
 *
 * SÜS KATMANIDIR: harflere bölünmüş metin ekran okuyucuda harf harf okunur.
 * Çağıran, başlığın gerçek metnini ayrıca `sr-only` olarak vermeli; bu bileşen
 * kendini `aria-hidden` işaretler.
 */
export function HarfHarf({ metin, baslangic = 0, aralik = 0.035, className }: HarfHarfProps) {
  let sira = 0;
  const kelimeler = metin.split(' ');
  return (
    <span aria-hidden="true" className={cn('inline-block', className)}>
      {kelimeler.map((kelime, k) => (
        // Kelimeler arasındaki GERÇEK boşluk satır kırılma fırsatı; kelime
        // içinde kırılma yok (`nowrap`).
        <span key={k}>
          {k > 0 && ' '}
          <span className="inline-block whitespace-nowrap">
            {Array.from(kelime).map((harf, h) => {
              const gecikme = baslangic + sira++ * aralik;
              return (
                <span key={h} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                  <span
                    className="animate-harf-yuksel inline-block"
                    style={{ animationDelay: `${gecikme.toFixed(3)}s` }}
                  >
                    {harf}
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}
