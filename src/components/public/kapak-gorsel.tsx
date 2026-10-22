import { ImageIcon } from 'lucide-react';

import type { AttachmentRefDto } from '@/server/services/content-dto';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import { cn } from '@/lib/utils/cn';

/** Kapak görseli yokken kullanılan en-boy oranı (§5.1 proje ızgarası). */
const VARSAYILAN_ORAN = 16 / 10;

export type KapakGorselProps = {
  kapak: AttachmentRefDto | null;
  /** Görselin neyi temsil ettiği — `alt` metni ve yer tutucu etiketi. */
  baslik: string;
  /**
   * Adresi elle vermek için (nadir). Verilmezse `kapak` görselse adres KİMLİKTEN
   * üretiliyor (`dosyaAdresi`, ADR-044) — çağıranların hiçbiri değişmedi.
   */
  src?: string;
  className?: string;
  /** Görsel yokken yer tutucunun erişilebilir adı — dile göre (ADR-046). */
  yokEtiketi?: string;
};

/**
 * Kapak görseli — TEK KALIP. T-024 (proje detayı) ve T-037 (imzalı URL) aynı
 * bileşeni kullanır; kapak bağlanınca DÜZEN DEĞİŞMEZ.
 *
 * CLS SÖZLEŞMESİ: yer ayırma her durumda `aspect-ratio` ile yapılır.
 *   - `kapak.width/height` varsa gerçek oran kullanılır
 *   - yoksa (veya görsel değilse, örn. PDF) 16/10'a düşülür
 * Böylece yer tutucu → gerçek görsel geçişinde kutu ölçüsü sabit kalır ve
 * K1'in CLS < 0.05 hedefi korunur.
 *
 * Yer tutucu token'lıdır (hex yok) ve "eksik" gibi değil, kasıtlı bir yüzey
 * gibi görünür — kapağı olmayan proje kartı bozuk görünmemeli.
 */
export function KapakGorsel({ kapak, baslik, src, className, yokEtiketi }: KapakGorselProps) {
  const oran = kapak?.width && kapak.height ? kapak.width / kapak.height : VARSAYILAN_ORAN;
  // PDF gibi görsel olmayan bir eklenti kapak olarak ÇİZİLMEZ — yer tutucu kalır.
  const adres = src ?? (kapak?.mime.startsWith('image/') ? dosyaAdresi(kapak.id) : undefined);

  return (
    <div
      className={cn('bg-elevated relative w-full overflow-hidden', className)}
      style={{ aspectRatio: oran }}
    >
      {adres ? (
        /*
         * DÜZ `<img>`, `next/image` DEĞİL — T-037f kararı. Görsel AYNI KÖKENDEN
         * ve kalıcı adresle geliyor (`immutable` önbellek), `width`/`height`
         * DTO'dan geliyor ve kutu `aspect-ratio` ile zaten ayrılmış — yani CLS
         * yok. `next/image`in kazancı (yeniden boyutlandırma, AVIF) ölçülmedi;
         * eklemek optimizasyon sunucusunu bu uca ikinci bir okuma yolu olarak
         * bağlardı. Lighthouse bir gün görsel boyutunu işaret ederse yeniden
         * değerlendirilir.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={adres}
          alt={baslik}
          loading="lazy"
          decoding="async"
          width={kapak?.width ?? undefined}
          height={kapak?.height ?? undefined}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="from-accent/12 to-accent-blue/12 flex h-full w-full items-center justify-center bg-gradient-to-br"
          role="img"
          aria-label={yokEtiketi ?? `${baslik} — kapak görseli henüz eklenmedi`}
        >
          <ImageIcon className="text-muted size-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
