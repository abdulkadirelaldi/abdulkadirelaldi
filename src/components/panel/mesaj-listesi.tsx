'use client';

import { Inbox, Mail, MailOpen } from 'lucide-react';
import Link from 'next/link';

import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import type { ContactMessageListItemDto } from '@/server/services/contact-message';

/**
 * MESAJ LİSTESİ — T-032'nin veri tablosu deseninin ÜÇÜNCÜ kopyası.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SATIRDA EYLEM YOK — TIKLANINCA MESAJ AÇILIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Projeler ve deneyim ekranlarında satırda "Düzenle"/"Arşivle" düğmeleri var;
 * burada YOK ve bu bilinçli. Bir mesaj hakkında karar vermek (spam mı, işe mi
 * dönüşecek) GÖVDESİNİ okumayı gerektiriyor, listede ise yalnızca 160
 * karakterlik önizleme var. Satırdan spam işaretlemek, okumadan karar vermeyi
 * kolaylaştırırdı.
 *
 * ⚠️ `ip` / `userAgent` BU BİLEŞENE HİÇ GELMİYOR — `ContactMessageListItemDto`
 * onları taşımıyor (§8 / ADR-020). Ayrım Backend'in `LIST_SELECT`inde kurulu;
 * burada tipi genişletmek ya da detaydan veri taşımak o ayrımı bozardı.
 *
 * `data-mesaj-satir` ve `data-mesaj-id`: §9/2'nin bekleyen iddiası için
 * seçici. Testin sınıf adlarına tutunması, bir Tailwind değişikliğinde testi
 * sessizce kırardı.
 */
export function MesajListesi({
  mesajlar,
  bosBaslik,
  bosAciklama,
}: {
  mesajlar: ContactMessageListItemDto[];
  bosBaslik: string;
  bosAciklama: string;
}) {
  const sutunlar: ReadonlyArray<Sutun<ContactMessageListItemDto>> = [
    {
      anahtar: 'gonderen',
      baslik: 'Gönderen',
      deger: (m) => (
        <Link
          href={`/panel/mesajlar/${m.id}`}
          data-mesaj-satir
          data-mesaj-id={m.id}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="flex items-center gap-1.5">
            {/* Okunmamış AYRICA ikonla işaretli: yalnızca kalın yazı, renk
                körlüğü ve düşük kontrastlı ekranlarda ayırt edilemiyordu. */}
            {m.isRead ? (
              <MailOpen className="text-muted size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Mail className="text-accent size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className={m.isRead ? 'text-primary' : 'text-primary font-semibold'}>
              {m.name}
            </span>
            {!m.isRead && <span className="sr-only">(okunmamış)</span>}
          </span>
          <span className="tabular text-muted text-xs">{m.email}</span>
        </Link>
      ),
      siralamaDegeri: (m) => m.name,
    },
    {
      anahtar: 'konu',
      baslik: 'Konu / önizleme',
      deger: (m) => (
        <div className="flex max-w-md flex-col">
          <span className="text-body">{m.subject ?? 'Konu yok'}</span>
          <span className="text-muted line-clamp-2 text-xs">{m.preview}</span>
        </div>
      ),
      siralamaDegeri: (m) => m.subject ?? '',
    },
    {
      anahtar: 'durum',
      baslik: 'Durum',
      ikincil: true,
      deger: (m) => (
        <div className="flex flex-wrap gap-1">
          {m.isSpam && <Badge variant="danger">Spam</Badge>}
          {m.honeypotHit && <Badge variant="warning">Tuzak</Badge>}
          {m.archivedAt && <Badge variant="neutral">Arşiv</Badge>}
          {m.convertedJobId && <Badge variant="success">İşe dönüştü</Badge>}
          {m.repliedAt && <Badge variant="info">Yanıtlandı</Badge>}
        </div>
      ),
      siralamaDegeri: (m) => (m.isSpam ? 1 : 0),
    },
    {
      anahtar: 'spamScore',
      baslik: 'Puan',
      sayisal: true,
      ikincil: true,
      /* Puan ÖLÇÜLMEMİŞSE `null` — "0" yazmak ölçüm yapıldığı yalanı olurdu. */
      deger: (m) => m.spamScore ?? '—',
      siralamaDegeri: (m) => m.spamScore ?? -1,
    },
    {
      anahtar: 'createdAt',
      baslik: 'Geliş',
      sayisal: true,
      deger: (m) => m.createdAt.slice(0, 10),
      siralamaDegeri: (m) => m.createdAt,
    },
  ];

  return (
    <VeriTablosu
      baslik="Gelen mesajlar"
      satirlar={mesajlar}
      sutunlar={sutunlar}
      satirAnahtari={(m) => m.id}
      bosDurum={
        <EmptyState
          icon={Inbox}
          title={bosBaslik}
          description={bosAciklama}
          action={
            /* Boş durumun eylemi: kaçış görünümü. "Mesaj gönder" diye bir şey
               panelde yok — kullanıcı mesajı kendisi yazmıyor, alıyor. */
            <Link href="/panel/mesajlar?gorunum=hepsi" className={buttonClasses({ size: 'sm' })}>
              Süzgeçsiz hepsini göster
            </Link>
          }
        />
      }
    />
  );
}
