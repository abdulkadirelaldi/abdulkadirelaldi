import { cn } from '@/lib/utils/cn';

export type KonturBaslikProps = {
  metin: string;
  /** Başlık düzeyi — sayfada tek `h1` kuralı çağıranın sorumluluğunda. */
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
};

/**
 * ADR-045 — kaydırdıkça DOLAN kontur başlık (örnekteki "ABOUT ME").
 *
 * İKİ KATMAN, TEK METİN:
 *   - alttaki kontur kopya SÜS (`aria-hidden`), hep görünür;
 *   - üstteki DOLU kopya başlığın kendisi; `clip-path` ile soldan sağa açılır.
 * Ekran okuyucu metni BİR kez duyar; erişilebilir ad dolu katmandan gelir.
 *
 * HAREKET SAF CSS (`.kontur-dol`, globals.css): başlık ekranın altından girdiği
 * an boş, ekranın ortasına geldiğinde dolu. Sunucu bileşeni — JS göndermez.
 * Destek yoksa ya da hareket azaltılmışsa başlık baştan DOLU (taban stil).
 */
export function KonturBaslik({ metin, as: Etiket = 'h2', id, className }: KonturBaslikProps) {
  return (
    <div className={cn('relative', className)}>
      <span aria-hidden="true" className="dev-baslik metin-kontur block">
        {metin}
      </span>
      <Etiket id={id} className="dev-baslik text-primary kontur-dol absolute inset-0">
        {metin}
      </Etiket>
    </div>
  );
}
