'use client';

import { Briefcase, MessageSquare, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';

import { IS_DURUM_ETIKET, IS_DURUM_VARYANT } from '@/components/panel/is-gorunumleri';
import { paraBicimVeyaYok } from '@/components/panel/para-bicim';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { JobPanelListItemDto } from '@/server/services/job';

/**
 * İŞ LİSTESİ (tablo görünümü) — kanban'ın kaçış yüzeyi.
 *
 * Kanban kolonları üst sınırla kesiliyor (`truncated`); "tamamını listede gör"
 * bağlantısı BURAYA geliyor ve bu sayfa SAYFALANMIŞ, yani kesme yok. Kanban
 * tarama, bu liste ise tamamına erişme yüzeyi.
 *
 * ⚠️ TUTAR: `agreedAmount` + kendi para birimi. `baseAmount` burada YOK —
 * gerekçe `is-kanban.tsx`te: TRY karşılığı türetilmiş bir değer ve asıl işi
 * raporlama; liste sütununda iki tutar yan yana karışıklık üretir. TRY
 * karşılığı DETAY ekranında, kurla ve etiketle.
 *
 * İstemcide yeniden sıralama `VeriTablosu`nun kendi sütun sıralaması ile
 * mümkün ve BURADA sorun değil: bu liste sayfalanmış ama KESİLMİŞ değil, yani
 * elimizdeki satırlar o sayfanın tamamı. Kanban'da yapılmamasının sebebi
 * kesilme (`truncated`), sayfalama değil.
 */
export function IslerEkrani({
  isler,
  toplam,
  bosBaslik,
}: {
  isler: JobPanelListItemDto[];
  toplam: number;
  bosBaslik: string;
}) {
  const sutunlar: ReadonlyArray<Sutun<JobPanelListItemDto>> = [
    {
      anahtar: 'title',
      baslik: 'İş',
      deger: (i) => (
        <Link
          href={`/panel/isler/${i.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary flex items-center gap-1.5 font-medium">
            {i.title}
            {i.fromContactMessage && (
              <MessageSquare className="text-muted size-3 shrink-0" aria-label="Mesajdan dönüştü" />
            )}
          </span>
          {i.clientName && <span className="text-muted text-xs">{i.clientName}</span>}
        </Link>
      ),
      siralamaDegeri: (i) => i.title,
    },
    {
      anahtar: 'status',
      baslik: 'Durum',
      deger: (i) => <Badge variant={IS_DURUM_VARYANT[i.status]}>{IS_DURUM_ETIKET[i.status]}</Badge>,
      siralamaDegeri: (i) => IS_DURUM_ETIKET[i.status],
    },
    {
      anahtar: 'agreedAmount',
      baslik: 'Tutar',
      sayisal: true,
      deger: (i) => paraBicimVeyaYok(i.agreedAmount, i.currency),
      /*
        SIRALAMA DEĞERİ dize olarak veriliyor ve bu bilinçli: `Number()`'a
        çevirip sıralamak ADR-014/D'nin yasakladığı aritmetik olurdu. Dize
        karşılaştırması farklı para birimlerinde zaten anlamsız — bu sütunda
        sıralama "aynı birimde kabaca grupla" işine yarıyor, hassas bir
        büyüklük sırası vermiyor. Hassas sıralama gerekirse sunucuda yapılmalı.
      */
      siralamaDegeri: (i) => `${i.currency}-${(i.agreedAmount ?? '').padStart(16, '0')}`,
    },
    {
      anahtar: 'dueDate',
      baslik: 'Teslim',
      sayisal: true,
      ikincil: true,
      deger: (i) => i.dueDate ?? '—',
      siralamaDegeri: (i) => i.dueDate ?? '',
    },
    {
      anahtar: 'updatedAt',
      baslik: 'Güncelleme',
      sayisal: true,
      ikincil: true,
      deger: (i) => i.updatedAt.slice(0, 10),
      siralamaDegeri: (i) => i.updatedAt,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      /*
        YALNIZCA DÜZENLE. `Job` SİLME BU TURDA YOK — Backend eylemi henüz
        yazmadı, o yüzden düğme de yok (ölü düğme yasağı, T-018). Arşivleme de
        yok: `Job` arşivlenmiyor, durumu `CANCELLED`a çekiliyor ve o durum
        değişikliği kanban'dan ya da formdan yapılıyor.
      */
      deger: (i) => (
        <div className="flex justify-end">
          <Link
            href={`/panel/isler/${i.id}`}
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
          <span className="tabular">{toplam}</span> iş
        </p>

        <Link href="/panel/isler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni iş
        </Link>
      </div>

      <VeriTablosu
        baslik="İşler"
        satirlar={isler}
        sutunlar={sutunlar}
        satirAnahtari={(i) => i.id}
        bosDurum={
          <EmptyState
            icon={Briefcase}
            title={bosBaslik}
            description="Durum süzgecini değiştirebilir ya da yeni bir iş açabilirsin."
            action={
              <Link href="/panel/isler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                Yeni iş
              </Link>
            }
          />
        }
      />
    </div>
  );
}
