'use client';

import { Laptop } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { FormError } from '@/components/ui/form-error';
import { macAnahtariSilAction, macAnahtariUretAction } from '@/server/actions/masa';
import type { KopruDurumu } from '@/server/services/masa-koprusu';

const ZAMAN = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/**
 * MAC KÖPRÜSÜ KARTI (ADR-049 M6) — ders kayıtlarını Mac'te yazıya döken köprünün anahtarı ve
 * durumu. Anahtar YALNIZCA üretildiği anda görünür (sunucuda özeti saklanır).
 */
export function MacKopruKarti({ durum }: { durum: KopruDurumu }) {
  const router = useRouter();
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [silOnay, setSilOnay] = useState(false);
  const komut = anahtar ? `bash ~/Desktop/web/abdulkadirelaldi/kopru/mac/kur.sh ${anahtar}` : null;

  return (
    <section
      aria-labelledby="mac-kopru"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex items-center gap-2">
        <Laptop className="text-muted size-4" aria-hidden="true" />
        <h2 id="mac-kopru" className="text-primary text-base font-semibold">
          Ses kayıtları → yazı (Mac)
        </h2>
      </div>
      <p className="text-muted text-sm">
        {durum.kurulu
          ? durum.sonKullanim
            ? `Mac köprüsü bağlı · son görülme ${ZAMAN.format(new Date(durum.sonKullanim))}`
            : 'Anahtar üretildi; Mac köprüsü henüz bağlanmadı.'
          : "Ders kayıtları Mac'inde yazıya dökülür, ses dışarı çıkmaz. Başlamak için anahtar üret."}
        {(durum.sirada > 0 || durum.isleniyor > 0) &&
          ` · ${durum.sirada} kayıt sırada${durum.isleniyor ? `, ${durum.isleniyor} yazılıyor` : ''}`}
      </p>

      {komut && (
        <div className="flex flex-col gap-2">
          <p className="text-primary text-sm font-medium">
            Bu komutu Mac&apos;inde Terminal&apos;de bir kez çalıştır. Anahtar bir daha
            gösterilmeyecek.
          </p>
          <code className="bg-elevated text-primary rounded-lg p-3 text-xs break-all">{komut}</code>
          <CopyButton value={komut} />
        </div>
      )}
      {hata && <FormError>{hata}</FormError>}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={durum.kurulu ? 'secondary' : 'primary'}
          onClick={async () => {
            setHata(null);
            const s = await macAnahtariUretAction();
            if (s.ok) {
              setAnahtar(s.data.anahtar);
              router.refresh();
            } else setHata(s.error.message);
          }}
        >
          {durum.kurulu ? 'Anahtarı yenile' : 'Anahtar üret'}
        </Button>
        {durum.kurulu && (
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              if (!silOnay) return setSilOnay(true);
              const s = await macAnahtariSilAction();
              if (s.ok) {
                setAnahtar(null);
                setSilOnay(false);
                router.refresh();
              } else setHata(s.error.message);
            }}
          >
            {silOnay ? 'Eminim, bağlantıyı kes' : 'Bağlantıyı kes'}
          </Button>
        )}
      </div>
    </section>
  );
}
