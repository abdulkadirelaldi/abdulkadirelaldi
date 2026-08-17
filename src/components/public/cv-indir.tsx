import { Download, FileText } from 'lucide-react';
import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';
import type { AttachmentRefDto } from '@/server/services/content-dto';

export type CvIndirProps = {
  /** `ProfileDto.cv` — dosya YÜKLENMİŞSE dolu, URL taşımaz (ADR-018). */
  cv: AttachmentRefDto | null;
  /**
   * İmzalı indirme adresi — T-037 gelince doldurulacak TEK yer.
   *
   * Bugün hiçbir çağıran bunu vermiyor; `AttachmentRefDto` yalnızca R2 nesne
   * anahtarını taşıyor ve imzalı URL üretimi Backend'de henüz yok. Prop olarak
   * durması bilinçli: T-037 tamamlandığında `/hakkimda` sayfasında tek satır
   * değişecek, bu bileşen ve dallarının hiçbiri yeniden yazılmayacak.
   */
  indirmeUrl?: string | null;
};

/**
 * CV indirme bloğu — §4.1 (/hakkimda).
 *
 * ÜÇ DURUM, ÜÇÜ DE DÜRÜST:
 *
 *   1. URL VAR       → gerçek indirme bağlantısı.
 *   2. DOSYA VAR, URL YOK → "yakında" işaretli, TIKLANAMAZ bir kutu. Bağlantı
 *      GİBİ görünen ama hiçbir yere gitmeyen bir öğe koymuyoruz.
 *   3. DOSYA YOK     → blok hiç render edilmez; onun yerine /cv sayfasına
 *      yönlendiriliyor, çünkü o sayfa dosyaya bağlı değil ve yazdırılabilir.
 *
 * T-018'in disiplini: çalışıyormuş gibi görünen ölü bağlantı yok. Bozuk bir
 * indirme, indirme olmamasından kötüdür — kullanıcı tıklar, bekler, hiçbir şey
 * olmaz ve sorunun kendisinde olduğunu düşünür.
 */
export function CvIndir({ cv, indirmeUrl = null }: CvIndirProps) {
  const hazir = Boolean(cv && indirmeUrl);

  return (
    <div className="border-line bg-surface/60 rounded-card flex flex-wrap items-center justify-between gap-4 border p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="bg-elevated text-muted rounded-btn flex size-10 shrink-0 items-center justify-center"
        >
          <FileText className="size-5" />
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-primary text-base font-semibold">Özgeçmiş</p>
          <p className="text-muted max-w-md text-sm">
            {hazir
              ? 'PDF olarak indir; aynı içeriğin yazdırılabilir sürümü de var.'
              : 'PDF indirme henüz hazır değil. Aynı bilgilerin tamamı yazdırılabilir CV sayfasında duruyor.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {hazir ? (
          <a
            href={indirmeUrl ?? undefined}
            download
            className={buttonClasses({ className: 'shrink-0' })}
          >
            <Download className="size-4" aria-hidden="true" />
            PDF indir
          </a>
        ) : (
          /*
            Buton DEĞİL, `<span>`: devre dışı bir buton bile odak sırasına
            girebiliyor ve ekran okuyucuya "buton" diye duyuruluyor. Burada
            tıklanacak bir şey yok — bu bir DURUM bildirimi.
          */
          <span className="border-line text-muted rounded-btn inline-flex shrink-0 items-center gap-2 border border-dashed px-4 py-2 text-sm">
            <Download className="size-4" aria-hidden="true" />
            PDF yakında
          </span>
        )}

        <Link href="/cv" className={buttonClasses({ variant: hazir ? 'secondary' : 'primary' })}>
          CV sayfasını aç
        </Link>
      </div>
    </div>
  );
}
