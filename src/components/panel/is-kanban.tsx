'use client';

import { Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IS_DURUM_ETIKET, IS_DURUM_VARYANT, islerYolu } from '@/components/panel/is-gorunumleri';
import { paraBicimVeyaYok } from '@/components/panel/para-bicim';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import { changeJobStatusAction } from '@/server/actions/job';
import type { JobBoardDto, JobPanelListItemDto } from '@/server/services/job';
import { JobStatus } from '@/types';

/**
 * KANBAN — §4.2, ADR-017'nin beş kolonu. KALIPTA YOK, yeni desen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DURUM DEĞİŞTİRME: AÇILIR LİSTE, SÜRÜKLE-BIRAK DEĞİL — ÜÇ GEREKÇE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. ERİŞİLEBİLİRLİK BORCU. Sürükleme klavyeyle taşımayı KENDİ BAŞINA
 *    getirmiyor: tut/taşı/bırak için tuş atamaları, canlı bölge duyuruları ve
 *    odak yönetimi yazmak gerekir. Kartın klavye kabulü BAĞLAYICI ve açılır
 *    liste bunu sıfır ek işle veriyor — `<select>` yerel olarak klavye ve ekran
 *    okuyucu uyumlu.
 *
 * 2. BACKEND'İN `truncated` KARARI SÜRÜKLEMEYİ ZATEN ANLAMSIZ KILIYOR. Kolon
 *    başına üst sınır 50 ve gerçek toplam ayrı geliyor; Backend kolon başına
 *    sayfalamayı PERFORMANS DEĞİL ANLAM gerekçesiyle reddetti: "dolu kolona
 *    kart taşımak görünen sayfadan bir kartı düşürür ve kullanıcı taşımanın
 *    başarısız olduğunu sanır." Sürükleme tam o yanılgıyı üretirdi — kullanıcı
 *    kartı bırakır, kart listede görünmez, taşıma başarılı olduğu hâlde
 *    başarısız sanılır. Açılır listede ise kart kendi yerinde kalıyor ve
 *    sonucu bildirim söylüyor.
 *
 * 3. HEDEF AÇIK. Sürüklemede "nereye bıraktım" bir konum tahminidir; açılır
 *    listede hedef kolonun ADI yazılı. Beş kolonlu bir panoda bu fark küçük
 *    görünüyor ama iptal ile teslim yan yana olduğunda değil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İSTEMCİDE YENİDEN SIRALAMA YOK — T-052'nin dersi
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kolonlar Backend'in sırasıyla geliyor (canlı: `dueDate asc nulls last`,
 * arşiv: `updatedAt desc`) ve bu bileşen `items` dizisini OLDUĞU GİBİ
 * çiziyor. Sıralamak yanlış cevap verirdi: liste ÜST SINIRLA KESİLMİŞ, yani
 * elimizdeki 50 kart kolonun tamamı değil — onları yeniden sıralamak
 * "kolonun en yakın teslimi" sorusunu bozardı.
 *
 * Durum değişince `router.refresh()` çağrılıyor: kart yeni kolonuna SUNUCUNUN
 * sıralamasıyla yerleşsin. Kartı istemcide taşımak, sıralamayı tahmin etmek
 * olurdu.
 */
export function IsKanban({ pano }: { pano: JobBoardDto }) {
  const router = useRouter();
  const [calisan, setCalisan] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const durumDegistir = async (is: JobPanelListItemDto, yeni: JobStatus) => {
    setCalisan(is.id);
    setHata(null);
    setBildirim(null);
    try {
      const sonuc = await changeJobStatusAction({ id: is.id, status: yeni });
      if (sonuc.ok) {
        setBildirim(
          `"${is.title}" → ${IS_DURUM_ETIKET[yeni]}. Kart yeni kolonundaki sırasına yerleşti.`,
        );
        router.refresh();
      } else {
        setHata(sonuc.error.message);
      }
    } catch {
      setHata('Durum değiştirilemedi — bağlantı kurulamadı. İş olduğu gibi duruyor.');
    } finally {
      setCalisan(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {bildirim && (
        <p
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
        >
          {bildirim}
        </p>
      )}

      {hata && <FormAlert>{hata}</FormAlert>}

      {/*
        KOLONLAR YATAY KAYDIRILIYOR. `relative` ŞART — T-055f'te `VeriTablosu`da
        ölçülen kusurun aynısı: kaydırma kutusunda konumlandırılmış ata yoksa
        içindeki mutlak konumlu öğeler (`.sr-only`) kırpmadan kaçıp sayfaya
        yatay taşma düşürüyor.
      */}
      <div className="relative -mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-max gap-3">
          {pano.columns.map((kolon) => (
            <section
              key={kolon.status}
              aria-label={`${IS_DURUM_ETIKET[kolon.status]} kolonu`}
              className="border-line bg-surface/60 rounded-card flex w-72 shrink-0 flex-col gap-2 border p-3"
            >
              <header className="flex flex-wrap items-center justify-between gap-2">
                {/*
                  `h2` — `h3` DEĞİL. Ölçüldü: Lighthouse `heading-order`
                  kırmızıya düştü (erişilebilirlik 100 → 98). Sayfanın `h1`i
                  Topbar'ın başlığı ve kanban kolonları ONUN ALTINDAKİ ilk
                  seviye; `h3` kullanmak `h2`yi atlayıp ekran okuyucunun
                  başlık ağacını bozuyordu. Boyut `text-sm` ile ayarlanıyor —
                  görsel hiyerarşi için başlık seviyesi oynatılmaz.
                */}
                <h2 className="text-primary text-sm font-medium">
                  {IS_DURUM_ETIKET[kolon.status]}
                </h2>

                {/*
                  ⚠️ `truncated` DÜRÜSTÇE: "50 / 1240". Gizlenirse kullanıcı
                  eksik veriyi TAM sanar — Backend kolon başına sayfalamayı tam
                  bu yüzden reddetti ve sayıyı ayrıca gönderdi.
                */}
                <span className="tabular text-muted text-xs">
                  {kolon.truncated ? `${kolon.items.length} / ${kolon.total}` : kolon.total}
                </span>
              </header>

              {kolon.truncated && (
                <p className="text-muted text-xs">
                  Bu kolonun ilk <span className="tabular">{pano.columnLimit}</span> kaydı
                  gösteriliyor.{' '}
                  <Link
                    href={islerYolu({ gorunum: 'liste', durum: kolon.status.toLowerCase() })}
                    className="focus-ring link rounded"
                  >
                    Tamamını listede gör
                  </Link>
                </p>
              )}

              {kolon.items.length === 0 ? (
                <p className="text-muted py-4 text-center text-xs">Bu kolonda iş yok.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {kolon.items.map((is) => (
                    <li key={is.id}>
                      <IsKarti
                        is={is}
                        calisiyor={calisan === is.id}
                        kilit={calisan !== null}
                        durumDegistir={(yeni) => void durumDegistir(is, yeni)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tek kart.
 *
 * ⚠️ TUTAR: `agreedAmount` + kendi para birimi gösteriliyor, `baseAmount` DEĞİL.
 * Gerekçe ADR-014: `agreedAmount` kaydın KENDİ GERÇEĞİ — kullanıcının anlaştığı
 * sayı. `baseAmount` türetilmiş TRY karşılığı ve asıl işi RAPORLAMA (T-105).
 * İkisini kartta yan yana göstermek, 1.000 $ işin altında "34.120,00 ₺" yazmak
 * ve kullanıcıya iki farklı tutar varmış gibi hissettirmek olurdu. TRY karşılığı
 * DETAY ekranında, kurla birlikte ve etiketlenmiş hâlde duruyor.
 */
function IsKarti({
  is,
  calisiyor,
  kilit,
  durumDegistir,
}: {
  is: JobPanelListItemDto;
  calisiyor: boolean;
  kilit: boolean;
  durumDegistir: (yeni: JobStatus) => void;
}) {
  return (
    <article className="border-line bg-elevated rounded-card flex flex-col gap-2 border p-3">
      <Link
        href={`/panel/isler/${is.id}`}
        className="focus-ring rounded-btn -m-1 flex flex-col gap-0.5 p-1"
      >
        <span className="text-primary text-sm font-medium">{is.title}</span>
        {is.clientName && <span className="text-muted text-xs">{is.clientName}</span>}
      </Link>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="tabular text-body text-sm">
          {paraBicimVeyaYok(is.agreedAmount, is.currency)}
        </span>

        {is.dueDate && <span className="tabular text-muted text-xs">Teslim {is.dueDate}</span>}

        {/*
          `fromContactMessage` AYRIŞMASI GÖRÜNÜR (Backend testle sabitledi):
          dönüşümden gelen iş ile elle açılan aynı listede duruyor ama hangisi
          olduğu belli. Kimlik DEĞİL yalnızca olgusu — bağlantı kurulacak yer
          detay ekranı ve `sourceMessage` orada tam özetle var.
        */}
        {is.fromContactMessage && (
          <span className="text-muted inline-flex items-center gap-1 text-xs">
            <MessageSquare className="size-3" aria-hidden="true" />
            Mesajdan
          </span>
        )}
      </div>

      {/*
        DURUM DEĞİŞTİRME — yerel `<select>`. Etiket karta özgü, çünkü panoda
        beş kolonda onlarca "Durum" etiketi olsa ekran okuyucu hangisinin hangi
        işe ait olduğunu söyleyemezdi.
      */}
      <div className="flex items-center gap-2">
        <label htmlFor={`durum-${is.id}`} className="sr-only">
          {is.title} durumunu değiştir
        </label>

        <select
          id={`durum-${is.id}`}
          value={is.status}
          disabled={kilit}
          onChange={(olay) => durumDegistir(olay.target.value as JobStatus)}
          className="focus-ring rounded-input border-line-strong bg-surface text-body h-9 flex-1 border px-2 text-xs disabled:opacity-100"
        >
          {Object.values(JobStatus).map((durum) => (
            <option key={durum} value={durum}>
              {IS_DURUM_ETIKET[durum]}
            </option>
          ))}
        </select>

        {calisiyor ? (
          <Loader2 className="text-muted size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Badge variant={IS_DURUM_VARYANT[is.status]}>{IS_DURUM_ETIKET[is.status]}</Badge>
        )}
      </div>
    </article>
  );
}

/** Pano boşsa — CTA'lı boş durum (T-002 kuralı). */
export function KanbanBosDurum() {
  return (
    <div className="border-line rounded-card flex flex-col items-center gap-3 border border-dashed p-10 text-center">
      <p className="text-primary text-sm font-medium">Henüz iş yok</p>
      <p className="text-muted max-w-md text-sm">
        İlk işi elle açabilir ya da gelen bir mesajı işe dönüştürebilirsin — dönüşümden gelen işler
        kartlarında “Mesajdan” etiketiyle görünür.
      </p>
      <Link href="/panel/isler/yeni" className={buttonClasses({ size: 'sm' })}>
        Yeni iş
      </Link>
    </div>
  );
}
