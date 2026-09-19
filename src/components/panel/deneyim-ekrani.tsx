'use client';

import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { aralik } from '@/components/public/gun-bicim';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { deleteExperienceAction } from '@/server/actions/experience';
import type { ExperienceDto } from '@/server/services/content-dto';
import { ExperienceType } from '@/types';

/**
 * DENEYİM LİSTESİ — §4.2 `/panel/icerik/deneyim`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME — ARŞİVLEME DEĞİL (ADR-017 ayrımı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Experience` GERÇEKTEN siliniyor: hiçbir yabancı anahtar buna bağlı değil ve
 * silinen satırın anlık görüntüsü `AuditLog`a yazılıyor. Yani kayıt kaybolmuyor,
 * YERİ değişiyor. `Project`/`Post` ise arşivleniyor (slug korunur, adres
 * "kaldırıldı" sayfasına düşer).
 *
 * Bu ayrım kullanıcıya da AYNI DİLLE anlatılıyor: buradaki onay "kalıcı olarak
 * silinir, denetim kaydında görünmeye devam eder" diyor; projelerdeki onay
 * "listelerden çıkar ama silinmez, geri alınabilir" diyor. İki farklı işlem
 * için tek bir "Sil" kelimesi kullanmak, birinde geri dönüş olduğunu, diğerinde
 * olmadığını gizlerdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM AYRI ROTAYA TAŞINDI (T-043f)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-034'te form bu sayfada açılıyordu. Liste sayfalandığı için düzenlenecek
 * kayıt artık elde olmayabilir; form `fetchExperienceForPanelById`in tek kayıt
 * okumasından besleniyor ve o bir SUNUCU okuması. Projelerle aynı yapı olması
 * ayrıca iki ekranın aynı kalıbı paylaşmasını sürdürüyor.
 */

const TUR_ETIKET: Record<ExperienceType, string> = {
  [ExperienceType.WORK]: 'İş',
  [ExperienceType.EDUCATION]: 'Eğitim',
};

export function DeneyimEkrani({ kayitlar, toplam }: { kayitlar: ExperienceDto[]; toplam: number }) {
  const router = useRouter();
  const [silinen, setSilinen] = useState<string | null>(null);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);

  const sil = async (kayit: ExperienceDto) => {
    setSilinen(kayit.id);
    setSilmeHatasi(null);
    try {
      const sonuc = await deleteExperienceAction({ id: kayit.id });
      if (sonuc.ok) {
        setBildirim(`"${kayit.role}" kaydı silindi. Denetim kaydında görünmeye devam ediyor.`);
        router.refresh();
      } else {
        setSilmeHatasi(sonuc.error.message);
      }
    } catch {
      setSilmeHatasi('Silinemedi — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setSilinen(null);
    }
  };

  const sutunlar: ReadonlyArray<Sutun<ExperienceDto>> = [
    {
      anahtar: 'role',
      baslik: 'Ünvan',
      deger: (k) => (
        <Link
          href={`/panel/icerik/deneyim/${k.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{k.role}</span>
          <span className="text-muted text-xs">{k.organization}</span>
        </Link>
      ),
      siralamaDegeri: (k) => k.role,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      ikincil: true,
      deger: (k) => (
        <Badge variant={k.type === ExperienceType.WORK ? 'accent' : 'neutral'}>
          {TUR_ETIKET[k.type]}
        </Badge>
      ),
      siralamaDegeri: (k) => TUR_ETIKET[k.type],
    },
    {
      anahtar: 'tarih',
      baslik: 'Tarih',
      sayisal: true,
      deger: (k) => aralik(k.startDate, k.endDate, k.current),
      siralamaDegeri: (k) => k.startDate,
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
        <div className="flex justify-end gap-1">
          <Link
            href={`/panel/icerik/deneyim/${k.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          <SilDugmesi kayit={k} calisiyor={silinen === k.id} sil={() => void sil(k)} />
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

      {silmeHatasi && <FormAlert>{silmeHatasi}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> kayıt · en yeni başlangıç üstte
        </p>

        <Link href="/panel/icerik/deneyim/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni kayıt
        </Link>
      </div>

      <VeriTablosu
        baslik="Deneyim kayıtları"
        satirlar={kayitlar}
        sutunlar={sutunlar}
        satirAnahtari={(k) => k.id}
        bosDurum={
          <EmptyState
            icon={GraduationCap}
            title="Henüz deneyim kaydı yok"
            description="İlk kaydı eklediğinde hem burada hem /hakkimda zaman çizelgesinde görünür."
            action={
              <Link href="/panel/icerik/deneyim/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk kaydı ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}

/** Silme onayı — arşivlemeden AYRI dil (yukarıdaki nota bakınız). */
function SilDugmesi({
  kayit,
  calisiyor,
  sil,
}: {
  kayit: ExperienceDto;
  calisiyor: boolean;
  sil: () => void;
}) {
  const [onayda, setOnayda] = useState(false);
  const onayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (onayda) onayRef.current?.focus();
  }, [onayda]);

  useEffect(() => {
    if (!onayda) return;
    const tusla = (o: KeyboardEvent) => o.key === 'Escape' && setOnayda(false);
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [onayda]);

  if (!onayda) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(true)}>
        <Trash2 className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{kayit.role} kaydını sil</span>
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`${kayit.role} kaydını silme onayı`}
      className="border-line bg-elevated rounded-card flex flex-col gap-2 border p-2 text-left"
    >
      <p className="text-body text-xs">
        <span className="text-primary font-medium">{kayit.role}</span> kaydı{' '}
        <span className="text-primary font-medium">kalıcı olarak silinir</span>. Denetim kaydında
        görünmeye devam eder.
      </p>
      <div className="flex gap-1.5">
        <button
          ref={onayRef}
          type="button"
          disabled={calisiyor}
          onClick={sil}
          className={buttonClasses({ variant: 'danger', size: 'sm' })}
        >
          {calisiyor ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3.5" aria-hidden="true" />
          )}
          {calisiyor ? 'Siliniyor…' : 'Evet, sil'}
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
