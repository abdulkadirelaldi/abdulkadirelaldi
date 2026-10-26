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
      {/* Kutu üstten/alttan 0,25em GENİŞ, metin aynı yerde (pt telafisi): dolgu
          `clip-path` ile kutuya kırpılıyor ve Ç/Ş çengeli, İ noktası satır kutusunun
          dışına taşıyordu — o parçalar dolmuyor, kontur olarak kalıyordu. */}
      <Etiket
        id={id}
        className="dev-baslik text-primary kontur-dol absolute inset-x-0 -top-[0.25em] -bottom-[0.25em] pt-[0.25em]"
      >
        {metin}
      </Etiket>
    </div>
  );
}
