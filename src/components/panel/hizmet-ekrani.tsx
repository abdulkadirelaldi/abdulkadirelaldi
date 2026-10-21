'use client';

import { Handshake, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteServiceAction } from '@/server/actions/service';
import type { ServiceDto } from '@/server/services/content-dto';

/**
 * HİZMET LİSTESİ — `/panel/icerik/hizmetler`.
 *
 * Kalıp ve silme dili yetenek/deneyim ekranlarıyla aynı (gerçek silme, satır
 * `AuditLog`a yazılıyor — gerekçe `services/skill.ts`).
 *
 * CTA SÜTUNU NEDEN VAR: `ctaUrl` boşsa public satır Kıyı Medya'ya gidiyor
 * (`HizmetListesi`). Listede bunu görünür kılmak, "bu hizmet nereye
 * yönlendiriyor" sorusunu her kaydı açmadan cevaplıyor.
 */

export function HizmetEkrani({ kayitlar, toplam }: { kayitlar: ServiceDto[]; toplam: number }) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<ServiceDto>> = [
    {
      anahtar: 'title',
      baslik: 'Hizmet',
      deger: (k) => (
        <Link
          href={`/panel/icerik/hizmetler/${k.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{k.title}</span>
          <span className="text-muted line-clamp-1 text-xs">{k.description}</span>
        </Link>
      ),
      siralamaDegeri: (k) => k.title,
    },
    {
      anahtar: 'cta',
      baslik: 'Yönlendirme',
      ikincil: true,
      deger: (k) =>
        k.ctaUrl ? (
          <Badge variant="accent">Özel bağlantı</Badge>
        ) : (
          <Badge variant="neutral">Kıyı Medya</Badge>
        ),
      siralamaDegeri: (k) => k.ctaUrl ?? '',
    },
    {
      anahtar: 'order',
      baslik: 'Sıra',
      sayisal: true,
      ikincil: true,
      deger: (k) => k.order,
      siralamaDegeri: (k) => k.order,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (k) => (
        <div className="flex items-start justify-end gap-1">
          <Link
            href={`/panel/icerik/hizmetler/${k.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          <KaliciSilDugmesi
            kayitAdi={k.title}
            aciklama="Denetim kaydında görünmeye devam eder."
            sil={async () => {
              const sonuc = await deleteServiceAction({ id: k.id });
              if (sonuc.ok) {
                setBildirim(`"${k.title}" silindi. Denetim kaydında görünmeye devam ediyor.`);
                router.refresh();
              }
              return sonuc;
            }}
          />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> hizmet · sitedeki sırayla
        </p>

        <Link href="/panel/icerik/hizmetler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni hizmet
        </Link>
      </div>

      <VeriTablosu
        baslik="Hizmetler"
        satirlar={kayitlar}
        sutunlar={sutunlar}
        satirAnahtari={(k) => k.id}
        bosDurum={
          <EmptyState
            icon={Handshake}
            title="Henüz hizmet yok"
            description="İlk hizmeti eklediğinde ana sayfada ve /hizmetler'de görünür."
            action={
              <Link href="/panel/icerik/hizmetler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk hizmeti ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
