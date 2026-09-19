'use client';

import { FolderOpen, Pencil, Plus } from 'lucide-react';
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
import { archiveProjectAction } from '@/server/actions/project';
import type { ProjectPanelListItemDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * PROJE LİSTESİ — §4.2 `/panel/icerik/projeler`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARTIK TÜM DURUMLAR GÖRÜNÜYOR (T-034/ENGEL-1 kapandı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetchProjectsForPanel` `publishedWhere` uygulamıyor: DRAFT, PUBLISHED,
 * SCHEDULED ve ARCHIVED hepsi geliyor. T-034'teki "yalnızca yayındakiler"
 * uyarı bandı KALDIRILDI — artık yalan söylüyordu.
 *
 * ARŞİVDEN GERİ ALMA BUNUNLA MÜMKÜN OLDU: arşivlenmiş kayıt listede duruyor,
 * "Düzenle" ile açılıyor ve durumu değiştirilerek geri alınıyor. Ayrı bir
 * "geri al" eylemi YOK ve gerekmiyor — Backend'de böyle bir eylem yok, durum
 * zaten formun bir alanı. Uydurma bir eylem yazmak yerine var olan yolu
 * kullanıcıya göstermek doğru olanı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DÜZENLEME AYRI ROTADA — SATIR İÇİ FORM DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-034'te form bu sayfada açılıyordu ve liste DTO'sundan besleniyordu; MDX
 * taşımadığı için içerik boş başlıyordu (ENGEL-2). Artık form
 * `fetchProjectForPanel`in TEK KAYIT okumasından besleniyor ve o bir sunucu
 * okuması — istemciden çağrılamaz. Ayrı rota, bu okumayı mümkün kılan şey.
 * T-041f'te mesaj detayı için verilen kararla aynı.
 */
export function ProjelerEkrani({
  projeler,
  toplam,
}: {
  projeler: ProjectPanelListItemDto[];
  toplam: number;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [arsivHatasi, setArsivHatasi] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<ProjectPanelListItemDto>> = [
    {
      anahtar: 'title',
      baslik: 'Proje',
      deger: (p) => (
        <Link
          href={`/panel/icerik/projeler/${p.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{p.title}</span>
          <span className="tabular text-muted text-xs">/{p.slug}</span>
        </Link>
      ),
      siralamaDegeri: (p) => p.title,
    },
    {
      anahtar: 'status',
      baslik: 'Durum',
      deger: (p) => <Badge variant={DURUM_VARYANT[p.status]}>{DURUM_ETIKET[p.status]}</Badge>,
      siralamaDegeri: (p) => DURUM_ETIKET[p.status],
    },
    {
      anahtar: 'featured',
      baslik: 'Öne çıkan',
      ikincil: true,
      deger: (p) => (p.featured ? <Badge variant="accent">Öne çıkan</Badge> : null),
      siralamaDegeri: (p) => (p.featured ? 1 : 0),
    },
    {
      anahtar: 'updatedAt',
      baslik: 'Güncelleme',
      sayisal: true,
      ikincil: true,
      /* Panel sıralaması bunun üzerinden (Backend kararı) — sütun da görünür olsun. */
      deger: (p) => p.updatedAt.slice(0, 10),
      siralamaDegeri: (p) => p.updatedAt,
    },
    {
      anahtar: 'publishedAt',
      baslik: 'Yayın',
      sayisal: true,
      ikincil: true,
      /* DRAFT kayıtlarda `null` — "—" yazmak, olmayan bir tarihi uydurmamak. */
      deger: (p) => p.publishedAt?.slice(0, 10) ?? '—',
      siralamaDegeri: (p) => p.publishedAt ?? '',
    },
    {
      anahtar: 'order',
      baslik: 'Sıra',
      sayisal: true,
      deger: (p) => p.order,
      siralamaDegeri: (p) => p.order,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (p) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Link
            href={`/panel/icerik/projeler/${p.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          {/*
            ARŞİVDEKİ KAYITTA ARŞİVLE DÜĞMESİ YOK: zaten arşivde. Yerine geri
            almanın nasıl yapıldığını söyleyen bir ipucu duruyor — düğme koyup
            hiçbir şey yapmamasındansa (T-018 dersi).
          */}
          {p.status === ContentStatus.ARCHIVED ? (
            <span className="text-muted px-2 py-2 text-xs">Düzenle → durumu değiştir</span>
          ) : (
            <ArsivleDugmesi
              kayitAdi={p.title}
              arsivle={async () => {
                const sonuc = await archiveProjectAction({ id: p.id });
                if (sonuc.ok) {
                  setBildirim(
                    `"${p.title}" arşivlendi. Listeden ÇIKMADI — Arşiv durumuyla burada duruyor; geri almak için Düzenle’den durumu Yayında yap.`,
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
          <span className="tabular">{toplam}</span> proje · en son güncellenen üstte
        </p>

        <Link href="/panel/icerik/projeler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni proje
        </Link>
      </div>

      <VeriTablosu
        baslik="Projeler"
        satirlar={projeler}
        sutunlar={sutunlar}
        satirAnahtari={(p) => p.id}
        bosDurum={
          <EmptyState
            icon={FolderOpen}
            title="Bu süzgeçte proje yok"
            description="Durum sekmesini değiştirebilir ya da yeni bir proje ekleyebilirsin."
            action={
              <Link href="/panel/icerik/projeler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk projeyi ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
