'use client';

import { Pencil, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { KATEGORI_BASLIK } from '@/components/public/yetenek-kategori';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteSkillAction } from '@/server/actions/skill';
import type { SkillDto } from '@/server/services/content-dto';

/**
 * YETENEK LİSTESİ — `/panel/icerik/yetenekler`.
 *
 * Deneyim ekranının kalıbı (bkz. `deneyim-ekrani.tsx`): liste burada, form ayrı
 * rotada (`yeni` / `[id]`), çünkü liste sayfalı ve düzenlenecek kayıt o sayfada
 * olmayabilir.
 *
 * SİLME GERÇEK SİLMEDİR, arşivleme değil — `Skill`e bağlı FK yok, slug'ı ve
 * public adresi yok; silinen satır `AuditLog`a yazılıyor (gerekçe
 * `services/skill.ts`'in yazma bölümünde). Onay metni bu yüzden "denetim
 * kaydında görünmeye devam eder" diyor — burada DOĞRU, çünkü `deleteSkillAction`
 * satırın alanlarını `diff`e yazıyor.
 *
 * Kategori etiketleri public tarafla TEK KAYNAKTAN (`KATEGORI_BASLIK`): panelde
 * "Altyapı" yazıp sitede "DevOps" görünmesin.
 */

export function YetenekEkrani({ kayitlar, toplam }: { kayitlar: SkillDto[]; toplam: number }) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<SkillDto>> = [
    {
      anahtar: 'name',
      baslik: 'Yetenek',
      deger: (k) => (
        <Link
          href={`/panel/icerik/yetenekler/${k.id}`}
          className="focus-ring rounded-btn text-primary -m-1 p-1 font-medium"
        >
          {k.name}
        </Link>
      ),
      siralamaDegeri: (k) => k.name,
    },
    {
      anahtar: 'category',
      baslik: 'Kategori',
      ikincil: true,
      deger: (k) => <Badge variant="neutral">{KATEGORI_BASLIK[k.category]}</Badge>,
      siralamaDegeri: (k) => KATEGORI_BASLIK[k.category],
    },
    {
      anahtar: 'level',
      baslik: 'Seviye',
      sayisal: true,
      ikincil: true,
      deger: (k) => k.level,
      siralamaDegeri: (k) => k.level,
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
            href={`/panel/icerik/yetenekler/${k.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          <KaliciSilDugmesi
            kayitAdi={k.name}
            aciklama="Denetim kaydında görünmeye devam eder."
            sil={async () => {
              const sonuc = await deleteSkillAction({ id: k.id });
              if (sonuc.ok) {
                setBildirim(`"${k.name}" silindi. Denetim kaydında görünmeye devam ediyor.`);
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
          <span className="tabular">{toplam}</span> yetenek · sitedeki sırayla
        </p>

        <Link href="/panel/icerik/yetenekler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni yetenek
        </Link>
      </div>

      <VeriTablosu
        baslik="Yetenekler"
        satirlar={kayitlar}
        sutunlar={sutunlar}
        satirAnahtari={(k) => k.id}
        bosDurum={
          <EmptyState
            icon={Wrench}
            title="Henüz yetenek yok"
            description="İlk yeteneği eklediğinde ana sayfadaki yetenekler bölümünde ve /cv'de görünür."
            action={
              <Link href="/panel/icerik/yetenekler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk yeteneği ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
