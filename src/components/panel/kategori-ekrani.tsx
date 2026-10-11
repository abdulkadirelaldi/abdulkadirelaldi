'use client';

import { ArchiveRestore, Pencil, Plus, Tags } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { ISLEM_TURU_ETIKET, ISLEM_TURU_VARYANT } from '@/components/panel/muhasebe-gorunumleri';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { archiveTransactionCategoryAction } from '@/server/actions/transaction-category';
import type { TransactionCategoryPanelDto } from '@/server/services/transaction-category';

/**
 * KATEGORİ YÖNETİMİ — §4.2 `/panel/muhasebe/kategoriler`.
 *
 * ARŞİVLE ≠ SİL ve `transactionCount` bunu kullanıcıya gösteren sayı: kategori
 * silinmiyor çünkü `Transaction.categoryId` FK'si `onDelete: Restrict`. Sayı
 * iki bağı TOPLUYOR (işlemler + tekrarlayan şablonlar) — Backend'in notu:
 * bir kategori yalnızca şablonlarda kullanılıyorsa da silinemez.
 *
 * RENK BİR VERİ, TOKEN DEĞİL (§3.1): kategori rengi kullanıcı girdisi ve
 * grafiklerde (T-105) kullanılacak. Burada küçük bir örnek kare olarak
 * gösteriliyor — `style` ile, çünkü değer çalışma zamanında geliyor ve Tailwind
 * sınıfı üretilemez. §3.1'in "bileşende hex yazmak yasak" kuralı SABİT renkler
 * için; buradaki hex veritabanından geliyor.
 */
export function KategoriEkrani({
  kategoriler,
  toplam,
}: {
  kategoriler: TransactionCategoryPanelDto[];
  toplam: number;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisan, setCalisan] = useState<string | null>(null);

  const arsivdenCikar = async (k: TransactionCategoryPanelDto) => {
    setCalisan(k.id);
    setHata(null);
    try {
      const sonuc = await archiveTransactionCategoryAction({ id: k.id, isArchived: false });
      if (sonuc.ok) {
        setBildirim(`"${k.name}" arşivden çıkarıldı. Yeni işlemlerde yeniden seçilebilir.`);
        router.refresh();
      } else {
        setHata(sonuc.error.message);
      }
    } catch {
      setHata('İşlem tamamlanamadı — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setCalisan(null);
    }
  };

  const sutunlar: ReadonlyArray<Sutun<TransactionCategoryPanelDto>> = [
    {
      anahtar: 'name',
      baslik: 'Kategori',
      deger: (k) => (
        <Link
          href={`/panel/muhasebe/kategoriler/${k.id}`}
          className="focus-ring rounded-btn -m-1 flex items-center gap-2 p-1"
        >
          {k.color && (
            <span
              aria-hidden="true"
              className="border-line size-3.5 shrink-0 rounded border"
              style={{ backgroundColor: k.color }}
            />
          )}
          <span className="text-primary font-medium">{k.name}</span>
        </Link>
      ),
      siralamaDegeri: (k) => k.name,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      deger: (k) => <Badge variant={ISLEM_TURU_VARYANT[k.type]}>{ISLEM_TURU_ETIKET[k.type]}</Badge>,
      siralamaDegeri: (k) => ISLEM_TURU_ETIKET[k.type],
    },
    {
      anahtar: 'durum',
      baslik: 'Durum',
      deger: (k) =>
        k.isArchived ? (
          <Badge variant="warning">Arşiv</Badge>
        ) : (
          <Badge variant="success">Aktif</Badge>
        ),
      siralamaDegeri: (k) => (k.isArchived ? 1 : 0),
    },
    {
      anahtar: 'transactionCount',
      baslik: 'Kayıt',
      sayisal: true,
      /* "Neden silinemiyor" sorusunun cevabı — işlemler + tekrarlayan şablonlar. */
      deger: (k) => k.transactionCount,
      siralamaDegeri: (k) => k.transactionCount,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (k) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Link
            href={`/panel/muhasebe/kategoriler/${k.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          {k.isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() => void arsivdenCikar(k)}
            >
              <ArchiveRestore className="size-3.5" aria-hidden="true" />
              Arşivden çıkar
            </Button>
          ) : (
            <ArsivleDugmesi
              kayitAdi={k.name}
              arsivle={async () => {
                const sonuc = await archiveTransactionCategoryAction({
                  id: k.id,
                  isArchived: true,
                });
                if (sonuc.ok) {
                  setBildirim(
                    `"${k.name}" arşivlendi. SİLİNMEDİ — bağlı ${k.transactionCount} kayıt olduğu gibi duruyor; yeni işlemlerde seçilemez.`,
                  );
                  router.refresh();
                } else {
                  setHata(sonuc.error.message);
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

      {hata && <FormAlert>{hata}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> kategori
        </p>

        <Link href="/panel/muhasebe/kategoriler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni kategori
        </Link>
      </div>

      <VeriTablosu
        baslik="İşlem kategorileri"
        satirlar={kategoriler}
        sutunlar={sutunlar}
        satirAnahtari={(k) => k.id}
        bosDurum={
          <EmptyState
            icon={Tags}
            title="Henüz kategori yok"
            description="İşlem kaydetmek için en az bir kategori gerekiyor. Gelir ve gider için ayrı kategoriler açabilirsin."
            action={
              <Link
                href="/panel/muhasebe/kategoriler/yeni"
                className={buttonClasses({ size: 'sm' })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Kategori ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
