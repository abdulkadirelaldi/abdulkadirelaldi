'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { baglantiKaldirAction } from '@/server/actions/oauth';
import type { BagliIstemci } from '@/server/services/oauth';

const zaman = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso));

/** Claude bağlantıları (ADR-056): her biri tek dokunuşla kaldırılır (bütün jetonları iptal). */
export function BaglantiListesi({ baglantilar }: { baglantilar: readonly BagliIstemci[] }) {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [onay, setOnay] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();
  const etkin = baglantilar.filter((b) => b.etkin);

  if (etkin.length === 0) {
    return <p className="text-muted text-sm">Henüz bağlı bir Claude yok.</p>;
  }
  return (
    <ul className="divide-line flex flex-col divide-y">
      {etkin.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-primary text-sm font-medium">{b.ad}</span>
            <span className="text-muted text-xs">
              {b.geriDonus} · bağlandı {zaman(b.createdAt)}
              {b.sonKullanim ? ` · son kullanım ${zaman(b.sonKullanim)}` : ''}
            </span>
          </div>
          <Button
            variant="danger"
            size="sm"
            disabled={bekliyor}
            onClick={() =>
              onay === b.id
                ? gecis(async () => {
                    setHata(null);
                    const s = await baglantiKaldirAction({ istemciId: b.id });
                    if (s.ok) router.refresh();
                    else setHata(s.error.message);
                    setOnay(null);
                  })
                : setOnay(b.id)
            }
          >
            {onay === b.id ? 'Eminim, kaldır' : 'Bağlantıyı kaldır'}
          </Button>
        </li>
      ))}
      {hata && <FormError>{hata}</FormError>}
    </ul>
  );
}
