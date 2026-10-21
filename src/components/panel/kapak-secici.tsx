'use client';

import { useState } from 'react';

import { DosyaYukleyici } from '@/components/panel/dosya-yukleyici';
import { KapakGorsel } from '@/components/public/kapak-gorsel';
import type { AttachmentDto } from '@/server/services/attachment';
import type { AttachmentRefDto } from '@/server/services/content-dto';
import type { AttachmentEntity } from '@/types';

/**
 * KAPAK SEÇİCİ — proje ve yazı formlarının ortak bloğu (T-037f).
 *
 * ⚠️ YÜKLEMEK BAĞLAMAK DEĞİL: yüklenen dosya önce projenin dosya havuzuna
 * girer; kapak olması, formun `coverAttachmentId`si KAYDEDİLİNCE olur
 * (`onSec` formun alanını dolduruyor). Böylece "kapak değişti" formun diğer
 * değişiklikleriyle TEK kayıtta ve tek denetim satırında.
 *
 * YENİ KAYITTA YÜKLEME YOK: eklenti var olan bir kayda bağlanıyor (ADR-018 —
 * polimorfik hedef doğrulanıyor). Kaydedilmemiş bir projenin kimliği yok;
 * ölü bir düğme yerine NE ZAMAN mümkün olacağı yazıyor.
 *
 * Önizleme public tarafın `KapakGorsel`ini kullanıyor — panelde görülen,
 * sitede görülenle AYNI bileşen ve aynı oran.
 */
export function KapakSecici({
  entity,
  entityId,
  mevcut,
  baslik,
  onSec,
}: {
  entity: Extract<AttachmentEntity, 'PROJECT' | 'POST'>;
  /** Kaydedilmemiş kayıtta `undefined`. */
  entityId: string | undefined;
  mevcut: AttachmentRefDto | null;
  baslik: string;
  onSec: (dosya: AttachmentDto) => void;
}) {
  const [secilen, setSecilen] = useState<AttachmentRefDto | null>(mevcut);
  const degisti = secilen?.id !== mevcut?.id;

  return (
    <fieldset className="border-line rounded-card flex flex-col gap-3 border p-4">
      <legend className="text-primary px-1 text-sm font-medium">Kapak görseli</legend>

      {secilen ? (
        <div className="w-full max-w-sm">
          <KapakGorsel kapak={secilen} baslik={`${baslik} kapağı`} className="rounded-btn" />
        </div>
      ) : (
        <p className="text-muted text-sm">Kapak yok — sitede tasarımlı bir yer tutucu çiziliyor.</p>
      )}

      {entityId ? (
        <>
          <DosyaYukleyici
            entity={entity}
            entityId={entityId}
            tur="gorsel"
            etiket={secilen ? 'Kapağı değiştir' : 'Kapak yükle'}
            onYuklendi={(dosya) => {
              setSecilen({
                id: dosya.id,
                key: dosya.key,
                mime: dosya.mime,
                width: dosya.width,
                height: dosya.height,
              });
              onSec(dosya);
            }}
          />
          {degisti && (
            <p className="text-warning text-xs">
              Yeni kapak <span className="font-medium">kaydedince</span> geçerli olur.
            </p>
          )}
        </>
      ) : (
        <p className="text-muted text-sm">
          Kapak, kayıt bir kez kaydedildikten sonra eklenebilir — dosya var olan bir kayda
          bağlanıyor.
        </p>
      )}
    </fieldset>
  );
}
