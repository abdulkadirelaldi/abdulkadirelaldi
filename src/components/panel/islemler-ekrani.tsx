'use client';

import { Pencil, Plus, Repeat, Wallet } from 'lucide-react';
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
import { Currency, TransactionType } from '@/types';

/**
 * İŞLEM LİSTESİ — §4.2 `/panel/muhasebe`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ HİÇBİR SÜTUN İSTEMCİDE SIRALANMIYOR — BACKEND'İN BAĞLAYICI NOTU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `siralamaDegeri` HİÇBİR sütunda verilmiyor, yani `VeriTablosu` sıralama
 * düğmesi de çizmiyor (tıklanıp hiçbir şey yapmayan başlık olmuyor).
 *
 * Sebep Backend'in notu: sıralama `date desc, createdAt desc` ve İKİNCİL
 * ANAHTAR ZORUNLU — `date` bir GÜN, aynı güne düşen işlemlerde tek anahtarla
 * sayfalama KARARSIZ olurdu ve aynı kayıt iki sayfada görünebilirdi. İstemci
 * `createdAt`i sütun olarak görmüyor; onunla ikincil sıralama yapamaz, yani
 * istemci sıralaması sunucunun verdiği cevabı BOZAR.
 *
 * Tutar sütununda ayrıca ADR-014/D engeli var: sıralamak için `Number()`'a
 * çevirmek gerekirdi ve farklı para birimlerinde zaten anlamsızdır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME DÜĞMESİ YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend'in kararı: "bir işlemi silmek defteri geriye dönük değiştirmektir."
 * Eylem yazılmadı, düğme de yok (T-018). Yanlış giriş DÜZELTİLİR — satırdaki
 * tek eylem "Düzenle" ve o yeterli.
 *
 * ⚠️ TUTAR: `amount` + kendi birimi GÖSTERİLİYOR, `baseAmount` DA gösteriliyor
 * ama AYRI SÜTUNDA ve yalnızca TRY dışı kayıtlarda dolu. T-103'te kanban
 * kartında iki tutarı yan yana koymamıştım; burada fark şu: muhasebe listesi
 * TOPLAMA bakılan yüzey ve TRY karşılığı o toplamın birimi. Yine de aynı
 * hücrede değil — iki sütun, iki başlık, karışma yok.
 */
export function IslemlerEkrani({
  islemler,
  toplam,
  bosBaslik,
}: {
  islemler: TransactionPanelListItemDto[];
  toplam: number;
  bosBaslik: string;
}) {
  const sutunlar: ReadonlyArray<Sutun<TransactionPanelListItemDto>> = [
    {
      anahtar: 'date',
      baslik: 'Tarih',
      sayisal: true,
      deger: (i) => <span className="whitespace-nowrap">{i.date}</span>,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      deger: (i) => (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={ISLEM_TURU_VARYANT[i.type]}>{ISLEM_TURU_ETIKET[i.type]}</Badge>
          {/* Cron ürünü mü (ADR-015) — kimliği değil olgusu. */}
          {i.fromRecurring && (
            <span className="text-muted inline-flex items-center gap-1 text-xs">
              <Repeat className="size-3" aria-hidden="true" />
              Tekrarlayan
            </span>
          )}
        </div>
      ),
    },
    {
      anahtar: 'kategori',
      baslik: 'Kategori / iş',
      deger: (i) => (
        <Link
          href={`/panel/muhasebe/${i.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{i.categoryName}</span>
          {/* İlişki adları DÜZLEŞTİRİLMİŞ — iki seviye kontrol gerekmiyor. */}
          {i.jobTitle && <span className="text-muted text-xs">{i.jobTitle}</span>}
          {!i.jobTitle && i.clientName && (
            <span className="text-muted text-xs">{i.clientName}</span>
          )}
        </Link>
      ),
    },
    {
      anahtar: 'amount',
      baslik: 'Tutar',
      sayisal: true,
      deger: (i) => paraBicim(i.amount, i.currency),
    },
    {
      anahtar: 'baseAmount',
      baslik: 'TRY karşılığı',
      sayisal: true,
      ikincil: true,
      /*
        TRY kayıtlarda `amount` ile AYNI olurdu — aynı sayıyı iki kez yazmak
        kullanıcıyı "neden iki sütun" diye düşündürür. Yalnızca farklı olduğunda
        dolduruluyor.
      */
      deger: (i) => (i.currency === Currency.TRY ? '—' : paraBicim(i.baseAmount, Currency.TRY)),
    },
    {
      anahtar: 'odeme',
      baslik: 'Ödeme',
      ikincil: true,
      deger: (i) => (
        <div className="flex flex-col gap-1">
          <Badge variant={i.isPaid ? 'success' : 'warning'}>
            {i.isPaid
              ? i.type === TransactionType.INCOME
                ? 'Tahsil edildi'
                : 'Ödendi'
              : i.type === TransactionType.INCOME
                ? 'Bekliyor'
                : 'Ödenmedi'}
          </Badge>
          <span className="text-muted text-xs">{ODEME_YONTEMI_ETIKET[i.method]}</span>
        </div>
      ),
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (i) => (
        <div className="flex justify-end">
          <Link
            href={`/panel/muhasebe/${i.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> işlem · en yeni tarih üstte
        </p>

        <Link href="/panel/muhasebe/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni işlem
        </Link>
      </div>

      <VeriTablosu
        baslik="İşlemler"
        satirlar={islemler}
        sutunlar={sutunlar}
        satirAnahtari={(i) => i.id}
        bosDurum={
          <EmptyState
            icon={Wallet}
            title={bosBaslik}
            description="Süzgeci değiştirebilir ya da yeni bir işlem girebilirsin."
            action={
              <Link href="/panel/muhasebe/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                Yeni işlem
              </Link>
            }
          />
        }
      />
    </div>
  );
}
