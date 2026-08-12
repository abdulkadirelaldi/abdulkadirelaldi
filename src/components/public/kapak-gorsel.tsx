import { ImageIcon } from 'lucide-react';

import type { AttachmentRefDto } from '@/server/services/content-dto';
import { cn } from '@/lib/utils/cn';

/** Kapak görseli yokken kullanılan en-boy oranı (§5.1 proje ızgarası). */
const VARSAYILAN_ORAN = 16 / 10;

export type KapakGorselProps = {
  kapak: AttachmentRefDto | null;
  /** Görselin neyi temsil ettiği — `alt` metni ve yer tutucu etiketi. */
  baslik: string;
  /**
   * İmzalı URL. ADR-018 gereği `AttachmentRefDto` URL TAŞIMAZ; imzalı adres
   * istek anında `key`den üretilir (T-037). O gelene kadar burası HEP boş ve
   * yer tutucu çizilir.
   */
  src?: string;
  className?: string;
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
export function KapakGorsel({ kapak, baslik, src, className }: KapakGorselProps) {
  const oran = kapak?.width && kapak.height ? kapak.width / kapak.height : VARSAYILAN_ORAN;

  return (
    <div
      className={cn('bg-elevated relative w-full overflow-hidden', className)}
      style={{ aspectRatio: oran }}
    >
      {src ? (
        /*
         * T-037 buraya `next/image` koyacak. `width`/`height` DTO'dan geldiği
         * için `sizes` ile birlikte CLS üretmeden çalışır.
         * eslint-disable gerekçesi: uzak alan adı yapılandırması `next.config.ts`
         * içinde ve o dosya ortak (§10.1) — imzalı URL görevi geldiğinde birlikte
         * çözülecek.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={baslik}
          width={kapak?.width ?? undefined}
          height={kapak?.height ?? undefined}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="from-accent/12 to-accent-blue/12 flex h-full w-full items-center justify-center bg-gradient-to-br"
          role="img"
          aria-label={`${baslik} — kapak görseli henüz eklenmedi`}
        >
          <ImageIcon className="text-muted size-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
