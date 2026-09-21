'use client';

import { Newspaper, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { DURUM_ETIKET, DURUM_VARYANT } from '@/components/panel/icerik-gorunumleri';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { archivePostAction } from '@/server/actions/post';
import type { PostPanelListItemDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * BLOG LİSTESİ — §4.2 `/panel/icerik/blog`.
 *
 * T-043f'in `projeler-ekrani.tsx` kalıbının DÖRDÜNCÜ kopyası: aynı durum
 * sütunu, aynı arşiv dili, aynı "arşivlenmiş satırda arşivle düğmesi yok"
 * kararı. Fark tek bir sütun (`readingMinutes`) ve boş durum metinleri.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `readingMinutes` HAM GÖSTERİLİYOR — public'teki `Math.max(1, …)` YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend'in kararı ve gerekçesi doğru: panelde BOZUK bir kolon görülebilmeli.
 * Public taraf okuyucuya "0 dk" demesin diye tabanı 1'e çekiyor; panelde aynı
 * şeyi yapmak, içeriği boş kalmış ya da hesaplaması tutmamış bir kaydı
 * gizlemek olurdu. Yani buradaki 0, düzeltilecek bir şeyin işareti.
 */
export function BlogEkrani({
  yazilar,
  toplam,
}: {
  yazilar: PostPanelListItemDto[];
  toplam: number;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [arsivHatasi, setArsivHatasi] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<PostPanelListItemDto>> = [
    {
      anahtar: 'title',
      baslik: 'Yazı',
      deger: (y) => (
        <Link
          href={`/panel/icerik/blog/${y.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{y.title}</span>
          <span className="tabular text-muted text-xs">/{y.slug}</span>
        </Link>
      ),
      siralamaDegeri: (y) => y.title,
    },
    {
      anahtar: 'status',
      baslik: 'Durum',
      deger: (y) => <Badge variant={DURUM_VARYANT[y.status]}>{DURUM_ETIKET[y.status]}</Badge>,
      siralamaDegeri: (y) => DURUM_ETIKET[y.status],
    },
    {
      anahtar: 'readingMinutes',
      baslik: 'Okuma',
      sayisal: true,
      ikincil: true,
      /* HAM — maskelenmiyor (yukarıdaki nota bakınız). */
      deger: (y) => y.readingMinutes,
      siralamaDegeri: (y) => y.readingMinutes,
    },
    {
      anahtar: 'updatedAt',
      baslik: 'Güncelleme',
      sayisal: true,
      ikincil: true,
      deger: (y) => y.updatedAt.slice(0, 10),
      siralamaDegeri: (y) => y.updatedAt,
    },
    {
      anahtar: 'publishedAt',
      baslik: 'Yayın',
      sayisal: true,
      ikincil: true,
      deger: (y) => y.publishedAt?.slice(0, 10) ?? '—',
      siralamaDegeri: (y) => y.publishedAt ?? '',
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (y) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Link
            href={`/panel/icerik/blog/${y.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          {y.status === ContentStatus.ARCHIVED ? (
            <span className="text-muted px-2 py-2 text-xs">Düzenle → durumu değiştir</span>
          ) : (
            <ArsivleDugmesi
              kayitAdi={y.title}
              arsivle={async () => {
                const sonuc = await archivePostAction({ id: y.id });
                if (sonuc.ok) {
                  setBildirim(
                    `"${y.title}" arşivlendi. Listeden ÇIKMADI — Arşiv durumuyla burada duruyor; geri almak için Düzenle’den durumu Yayında yap.`,
                  );
                  router.refresh();
                } else {
                  setArsivHatasi(sonuc.error.message);
                }
                return sonuc;
              }}
            />
          )}
        </div>
      ),
    },
  ];

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

      {arsivHatasi && <FormAlert>{arsivHatasi}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> yazı · en son güncellenen üstte
        </p>

        <Link href="/panel/icerik/blog/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni yazı
        </Link>
      </div>

      <VeriTablosu
        baslik="Blog yazıları"
        satirlar={yazilar}
        sutunlar={sutunlar}
        satirAnahtari={(y) => y.id}
        bosDurum={
          <EmptyState
            icon={Newspaper}
            title="Bu süzgeçte yazı yok"
            description="Durum sekmesini değiştirebilir ya da yeni bir yazı yazabilirsin."
            action={
              <Link href="/panel/icerik/blog/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk yazıyı ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
