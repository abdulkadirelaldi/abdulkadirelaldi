'use client';

import { Pencil, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';

import {
  ISLEM_TURU_ETIKET,
  ISLEM_TURU_VARYANT,
  ODEME_YONTEMI_ETIKET,
} from '@/components/panel/muhasebe-gorunumleri';
import { paraBicim } from '@/components/panel/para-bicim';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { TransactionPanelListItemDto } from '@/server/services/transaction';
import { TransactionType } from '@/types';

/**
 * BAĞLI ÖDEMELER — §4.2 "İş detayı + bağlı ödemeler + müşteri".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN T-103'TE YOKTU VE NEDEN BU BİR BOŞLUKTU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-103'te iş detayı yazıldı, T-104'te `IsBakiye` eklendi — dört TOPLAM sayı.
 * Ama §4.2 "bağlı ödemeler" diyor ve toplam bir liste değil. Kod da zaten
 * vardı: `fetchTransactionsForPanel` `jobId` filtresini T-101'den beri
 * destekliyor. Eksik olan tek şey BAĞLAMAKTI — F4 kabul kontrolünün bulduğu
 * "kod var, yol yok" sınıfı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LİSTE İLE DÖRT TOPLAM BİRBİRİNİ TUTMALI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `IsBakiye` dört sayı gösteriyor, bu liste satırları. İkisi AYNI kaynaktan
 * gelmiyor: toplamlar `fetchJobFinancials` (Prisma `groupBy`), satırlar
 * `fetchTransactionsForPanel`. Ayrışabilirler ve ayrıştıklarında kullanıcı
 * hangisine güveneceğini bilemez.
 *
 * Bu yüzden liste SAYFALANMIYOR ve üst sınır `transactionCount`tan BÜYÜK
 * verilerek çağrılıyor (sayfa dosyasında): kesilmiş bir liste, toplamları
 * tutmayan bir liste olurdu. Kesme olasılığı varsa sayfa bunu SÖYLÜYOR.
 *
 * ⚠️ TUTAR: `baseAmount` değil `amount` + kendi birimi — satır kaydın kendi
 * gerçeği. `IsBakiye`nin dört toplamı TRY karşılığı üzerinden ve bu fark
 * kartın altında yazılı; aksi hâlde 100 $ bir satırın altında "3.412,35 ₺"
 * toplam görmek tutarsızlık gibi okunurdu.
 */
/*
  ⚠️ `ODEME_UST_SINIR` BU DOSYADA DEĞİL — `is-gorunumleri.ts`te, ve sebebi
  ölçülmüş bir 500: bu dosya `'use client'` taşıyor, sunucu bileşeni buradan
  bir `const` okuduğunda paketleyici onu istemci başvuru VEKİLİYLE
  değiştiriyor ve sunucuda sayı yerine fonksiyon bulunuyor. Tip sistemi
  göremiyor. Gerekçenin tamamı o dosyada; buraya geri taşımak sayfayı yeniden
  500 verdirir.
*/

export function IsOdemeleri({
  odemeler,
  toplamSayi,
  jobId,
}: {
  odemeler: TransactionPanelListItemDto[];
  /** `JobFinancialsDto.transactionCount` — listeyle karşılaştırılacak sayı. */
  toplamSayi: number;
  jobId: string;
}) {
  const sutunlar: ReadonlyArray<Sutun<TransactionPanelListItemDto>> = [
    {
      anahtar: 'date',
      baslik: 'Tarih',
      sayisal: true,
      deger: (o) => <span className="whitespace-nowrap">{o.date}</span>,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      deger: (o) => <Badge variant={ISLEM_TURU_VARYANT[o.type]}>{ISLEM_TURU_ETIKET[o.type]}</Badge>,
    },
    {
      anahtar: 'kategori',
      baslik: 'Kategori',
      deger: (o) => (
        <Link
          href={`/panel/muhasebe/${o.id}`}
          className="focus-ring rounded-btn text-primary -m-1 block p-1 font-medium"
        >
          {o.categoryName}
        </Link>
      ),
    },
    {
      anahtar: 'amount',
      baslik: 'Tutar',
      sayisal: true,
      deger: (o) => paraBicim(o.amount, o.currency),
    },
    {
      anahtar: 'odeme',
      baslik: 'Ödeme',
      ikincil: true,
      deger: (o) => (
        <div className="flex flex-col gap-1">
          <Badge variant={o.isPaid ? 'success' : 'warning'}>
            {o.isPaid
              ? o.type === TransactionType.INCOME
                ? 'Tahsil edildi'
                : 'Ödendi'
              : o.type === TransactionType.INCOME
                ? 'Bekliyor'
                : 'Ödenmedi'}
          </Badge>
          <span className="text-muted text-xs">{ODEME_YONTEMI_ETIKET[o.method]}</span>
        </div>
      ),
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      /* SİLME YOK — Backend eylemi yazmadı ("defteri geriye dönük değiştirmek"). */
      deger: (o) => (
        <div className="flex justify-end">
          <Link
            href={`/panel/muhasebe/${o.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>
        </div>
      ),
    },
  ];

  /*
    ⚠️ TUTARSIZLIK GÖRÜNÜR OLMALI. İki okuma ayrışırsa kullanıcı bunu bir
    arıza olarak değil, kendi hesabındaki bir gariplik olarak yaşar. Sayılar
    uyuşmuyorsa SÖYLÜYORUZ — sessizce listeyi doğru, toplamı yanlış saymak
    (ya da tersi) kullanıcıyı yanlış sayıya güvendirir.
  */
  const tutarsiz = odemeler.length !== toplamSayi;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{odemeler.length}</span> bağlı ödeme · tutarlar kaydın kendi
          para biriminde
        </p>

        <Link href="/panel/muhasebe/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          İşlem ekle
        </Link>
      </div>

      {tutarsiz && (
        <p
          role="alert"
          className="rounded-input border-danger/40 bg-danger/8 text-danger border px-3 py-2.5 text-sm"
        >
          Bu listede <span className="tabular font-medium">{odemeler.length}</span> satır var ama
          bakiye hesabı <span className="tabular font-medium">{toplamSayi}</span> işlem sayıyor. İki
          okuma ayrıştı — yukarıdaki toplamlara güvenme ve bunu bildir.
        </p>
      )}

      <VeriTablosu
        baslik={`İşe bağlı ödemeler (${jobId})`}
        satirlar={odemeler}
        sutunlar={sutunlar}
        satirAnahtari={(o) => o.id}
        bosDurum={
          <EmptyState
            icon={Wallet}
            title="Bu işe bağlı ödeme yok"
            description="Muhasebeden bir işlem girip bu işe bağladığında burada ve yukarıdaki bakiyede görünür."
            action={
              <Link href="/panel/muhasebe/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İşlem ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
