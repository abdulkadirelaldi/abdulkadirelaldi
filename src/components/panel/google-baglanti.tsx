'use client';

import { CalendarCheck2, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { googleBaglantiKesAction, googleSimdiEsitleAction } from '@/server/actions/google-takvim';
import type { GoogleDurumu } from '@/server/services/google-takvim';

/** API ucu — sayfa değil; `next/link` ön çekerdi ve tam yönlendirme gerekiyor. */
const BAGLA_ADRESI = '/api/v1/panel/google/bagla';

const DONUS_METNI = {
  bagli: 'Google Takvim bağlandı. Tarihli işler birkaç saniye içinde takvimde.',
  hata: 'Bağlanılamadı. Yeniden dene; sürerse Google Cloud ayarlarını kontrol et.',
  iptal: 'Google izin ekranında vazgeçildi.',
} as const;

const zaman = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso));

/** Google Takvim bağlantı kartı (ADR-051). */
export function GoogleBaglanti({
  ilk,
  donus,
}: {
  ilk: GoogleDurumu;
  donus: keyof typeof DONUS_METNI | null;
}) {
  const [d, setD] = useState(ilk);
  const [hata, setHata] = useState<string | null>(null);
  const [kesOnay, setKesOnay] = useState(false);
  const [bekliyor, gecis] = useTransition();

  const calistir = (is: typeof googleSimdiEsitleAction) =>
    gecis(async () => {
      setHata(null);
      const s = await is();
      if (s.ok) setD(s.data);
      else setHata(s.error.message);
      setKesOnay(false);
    });

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5">
      <div className="flex items-start gap-3">
        <CalendarCheck2 className="text-accent mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="text-primary text-base font-semibold">Google Takvim</h2>
          <p className="text-muted text-sm">
            Tarihli her iş Google Takvim&apos;ine düşer; saatliyse 1 gün ve 2 saat önce, gün boyuysa
            bir önceki gün 09:00&apos;da hatırlatır. Tik atınca ✓ olur, silince kalkar.
          </p>
        </div>
      </div>

      {donus && (
        <p
          role="status"
          className={donus === 'bagli' ? 'text-success text-sm font-medium' : 'text-danger text-sm'}
        >
          {DONUS_METNI[donus]}
        </p>
      )}

      {!d.ayarli ? (
        <p className="text-muted rounded-xl border border-dashed p-3 text-sm">
          Sunucuda <code>GOOGLE_CLIENT_ID</code> ve <code>GOOGLE_CLIENT_SECRET</code> tanımlı değil.
        </p>
      ) : !d.bagli ? (
        <a
          href={BAGLA_ADRESI}
          className="focus-ring bg-accent inline-flex min-h-11 w-fit items-center rounded-full px-5 text-sm font-medium text-white"
        >
          Google Takvim&apos;i bağla
        </a>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="text-sm">
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-muted">Durum</dt>
              <dd className="text-success font-medium">Bağlı</dd>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-muted">Son eşitleme</dt>
              <dd className="text-primary">{d.sonEsitleme ? zaman(d.sonEsitleme) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-muted">Bekleyen</dt>
              <dd className="text-primary">{d.bekleyen}</dd>
            </div>
          </dl>
          {d.sonHata && <FormError>{d.sonHata}</FormError>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={bekliyor}
              onClick={() => calistir(googleSimdiEsitleAction)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Şimdi eşitle
            </Button>
            <Button
              variant="danger"
              className="ml-auto"
              disabled={bekliyor}
              onClick={() => (kesOnay ? calistir(googleBaglantiKesAction) : setKesOnay(true))}
            >
              {kesOnay ? 'Eminim, bağlantıyı kes' : 'Bağlantıyı kes'}
            </Button>
          </div>
        </div>
      )}
      {hata && <FormError>{hata}</FormError>}
    </section>
  );
}
