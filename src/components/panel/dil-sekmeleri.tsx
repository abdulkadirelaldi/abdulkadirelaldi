import Link from 'next/link';

import { icerikYolu } from '@/components/panel/icerik-gorunumleri';
import { Badge } from '@/components/ui/badge';
import { DIL_ADI, DILLER, dilMi, type Dil } from '@/i18n/diller';
import { cn } from '@/lib/utils/cn';

/**
 * DİL SEKMELERİ — ADR-046, panelde içeriği üç dilde yönetmek.
 *
 * `DurumSekmeleri` ile AYNI karar: her dil bir ADRES (`?dil=en`), bu yüzden
 * `Link` ve `nav`. Sunucu süzüyor — `locale` panel okumasının filtresine
 * geçiyor; istemcide süzmek sayfalanmış listede yalnızca o sayfayı süzerdi.
 *
 * DİL DEĞİŞİNCE SAYFA 1'E DÖNÜLÜYOR: İngilizce listenin 3. sayfası Türkçe
 * listenin 3. sayfasıyla ilgisiz; sayfa numarasını taşımak çoğu zaman boş bir
 * sayfaya düşürürdü. `korunan` (örn. durum süzgeci) ise taşınıyor — "Taslak"
 * bakarken dil değiştirmek taslakları göstermeye devam etmeli.
 *
 * Sekme başına SAYI YOK: üç ek sayım sorgusu demek, ve sekmelerin işi dil
 * seçmek — kaç kayıt olduğunu liste zaten yazıyor.
 *
 * SERVER COMPONENT: yalnızca bağlantı, istemci JS'i gerekmiyor.
 */
export function DilSekmeleri({
  taban,
  aktif,
  korunan = {},
}: {
  taban: string;
  aktif: Dil;
  /** Dil değişirken korunacak süzgeçler (sayfa HARİÇ — yukarıdaki nota bakınız). */
  korunan?: { durum?: string };
}) {
  return (
    <nav aria-label="İçerik dili" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex min-w-max gap-1.5">
        {DILLER.map((dil) => {
          const secili = dil === aktif;
          return (
            <li key={dil}>
              <Link
                href={icerikYolu(taban, { ...korunan, dil })}
                hrefLang={dil}
                aria-current={secili ? 'page' : undefined}
                className={cn(
                  'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center gap-1.5 border px-3 py-2 text-sm transition-colors',
                  secili
                    ? 'border-accent/40 bg-accent/12 text-accent-soft'
                    : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                )}
              >
                <span className="tabular font-medium uppercase">{dil}</span>
                <span className="text-muted">{DIL_ADI[dil]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Proje ve yazı formlarındaki "Çeviri anahtarı" alanının yardım metni — tek kaynak. */
export const CEVIRI_ANAHTARI_YARDIM =
  'Aynı içeriğin diğer dillerdeki kayıtlarıyla aynı anahtarı ver; dil değiştirici ve arama motorları (hreflang) bu bağla karşılığı bulur. Örn. spectraloop-hyperloop';

/**
 * Formun başlığındaki dil rozeti — kaydın HANGİ dilde yazıldığı tek bakışta.
 *
 * Bilinmeyen kod (eski bir satır, elle yazılmış `en-US`) OLDUĞU GİBİ
 * gösteriliyor: "Türkçe" diye yuvarlamak kaydın dilini yanlış söylerdi.
 */
export function DilRozeti({ dil }: { dil: string }) {
  return (
    <Badge variant="info" title="İçerik dili — kayıttan sonra değiştirilemez">
      <span className="uppercase">{dil}</span>
      <span aria-hidden="true">·</span>
      {dilMi(dil) ? DIL_ADI[dil] : dil}
    </Badge>
  );
}
