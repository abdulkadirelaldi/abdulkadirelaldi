'use client';

import { ArchiveRestore, Pencil, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { archiveClientAction } from '@/server/actions/client';
import type { ClientPanelListItemDto } from '@/server/services/client';

/**
 * MÜŞTERİ LİSTESİ — §4.2 `/panel/musteriler`. Kalıbın YEDİNCİ kopyası.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARŞİVLE ≠ SİL — VE `jobCount` BUNU KULLANICIYA GÖSTEREN SAYI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Client` SİLİNMİYOR, arşivleniyor (ADR-017): FK bağımlısı var — işler müşteriye
 * bağlı. `jobCount` tam bu yüzden DTO'da ve tam bu yüzden sütun olarak duruyor:
 * "bu kayıt neden silinemiyor" sorusunun cevabı o sayıdır. Gizlenirse kullanıcı
 * arşivlemeyi keyfî bir kısıtlama sanar.
 *
 * ARŞİVDEN GERİ ALMA BURADA, forma gitmeden: `archiveClientAction`
 * `isArchived: boolean` alıyor, yani tek eylem iki yönde çalışıyor. İçerik
 * ekranlarında (proje/blog) arşivden dönüş FORMDAN yapılıyordu çünkü orada durum
 * formun bir alanıydı; burada ayrı bir boole ve eylem iki yönlü, o yüzden satırda.
 * Uydurma bir eylem değil, var olanın ters yönü.
 */
export function MusterilerEkrani({
  musteriler,
  toplam,
  bosBaslik,
  bosAciklama,
}: {
  musteriler: ClientPanelListItemDto[];
  toplam: number;
  bosBaslik: string;
  bosAciklama: string;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisan, setCalisan] = useState<string | null>(null);

  const arsivDurumuDegistir = async (musteri: ClientPanelListItemDto, arsivle: boolean) => {
    setCalisan(musteri.id);
    setHata(null);
    try {
      const sonuc = await archiveClientAction({ id: musteri.id, isArchived: arsivle });
      if (sonuc.ok) {
        setBildirim(
          arsivle
            ? `"${musteri.name}" arşivlendi. SİLİNMEDİ — bağlı ${musteri.jobCount} iş olduğu gibi duruyor; Arşiv sekmesinden geri alabilirsin.`
            : `"${musteri.name}" arşivden çıkarıldı.`,
        );
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

  const sutunlar: ReadonlyArray<Sutun<ClientPanelListItemDto>> = [
    {
      anahtar: 'name',
      baslik: 'Müşteri',
      deger: (m) => (
        <Link
          href={`/panel/musteriler/${m.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{m.name}</span>
          {m.company && <span className="text-muted text-xs">{m.company}</span>}
        </Link>
      ),
      siralamaDegeri: (m) => m.name,
    },
    {
      anahtar: 'iletisim',
      baslik: 'İletişim',
      ikincil: true,
      deger: (m) => (
        <div className="flex flex-col">
          {m.email && <span className="tabular text-body text-xs">{m.email}</span>}
          {m.phone && <span className="tabular text-muted text-xs">{m.phone}</span>}
          {!m.email && !m.phone && <span className="text-muted text-xs">—</span>}
        </div>
      ),
      siralamaDegeri: (m) => m.email ?? '',
    },
    {
      anahtar: 'durum',
      baslik: 'Durum',
      deger: (m) => (
        <div className="flex flex-wrap gap-1">
          {m.isArchived && <Badge variant="warning">Arşiv</Badge>}
          {m.isKiyiMedya && <Badge variant="accent">Kıyı Medya</Badge>}
          {!m.isArchived && !m.isKiyiMedya && <Badge variant="success">Aktif</Badge>}
        </div>
      ),
      siralamaDegeri: (m) => (m.isArchived ? 1 : 0),
    },
    {
      anahtar: 'jobCount',
      baslik: 'İş',
      sayisal: true,
      /* "Neden silinemiyor" sorusunun cevabı — yukarıdaki nota bakınız. */
      deger: (m) => m.jobCount,
      siralamaDegeri: (m) => m.jobCount,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (m) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Link
            href={`/panel/musteriler/${m.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          {m.isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() => void arsivDurumuDegistir(m, false)}
            >
              <ArchiveRestore className="size-3.5" aria-hidden="true" />
              Arşivden çıkar
            </Button>
          ) : (
            <ArsivleDugmesi
              kayitAdi={m.name}
              arsivle={async () => {
                const sonuc = await archiveClientAction({ id: m.id, isArchived: true });
                if (sonuc.ok) {
                  setBildirim(
                    `"${m.name}" arşivlendi. SİLİNMEDİ — bağlı ${m.jobCount} iş olduğu gibi duruyor; Arşiv sekmesinden geri alabilirsin.`,
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
          <span className="tabular">{toplam}</span> müşteri
        </p>

        <Link href="/panel/musteriler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni müşteri
        </Link>
      </div>

      <VeriTablosu
        baslik="Müşteriler"
        satirlar={musteriler}
        sutunlar={sutunlar}
        satirAnahtari={(m) => m.id}
        bosDurum={
          <EmptyState
            icon={Users}
            title={bosBaslik}
            description={bosAciklama}
            action={
              <Link href="/panel/musteriler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                Müşteri ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
