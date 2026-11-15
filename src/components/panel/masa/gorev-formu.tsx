'use client';

import { useState } from 'react';

import { Alan } from '@/components/panel/alan';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { ONCELIK_ADLARI, ONCELIK_SECENEKLERI } from '@/lib/masa/bicim';
import { saatMetni } from '@/lib/takvim/bicim';
import { cn } from '@/lib/utils/cn';
import type { DolapSecenegi, GorevDto } from '@/server/services/masa';
import type { ApiResponse, GorevOnceligi } from '@/types';

/**
 * GÖREV FORMU (ADR-049 M2) — yeni ya da düzenleme. Doğrulama sunucuda (`gorevSchema`); alan
 * hataları alanın altında. Raf seçilince dolap rafın dolabıdır (servis de eşitler).
 */

export interface GorevFormDurumu {
  baslik: string;
  aciklama: string;
  dolapId: string;
  rafId: string;
  teslimGun: string;
  teslimSaat: string;
  oncelik: GorevOnceligi;
}

export function bosGorev(
  yer: { dolapId?: string | null; rafId?: string | null } = {},
): GorevFormDurumu {
  return {
    baslik: '',
    aciklama: '',
    dolapId: yer.dolapId ?? '',
    rafId: yer.rafId ?? '',
    teslimGun: '',
    teslimSaat: '',
    oncelik: 'NORMAL',
  };
}

export function gorevdenForm(g: GorevDto): GorevFormDurumu {
  return {
    baslik: g.baslik,
    aciklama: g.aciklama ?? '',
    dolapId: g.dolapId ?? '',
    rafId: g.rafId ?? '',
    teslimGun: g.teslimGun ?? '',
    teslimSaat: g.teslimDakika !== null ? saatMetni(g.teslimDakika) : '',
    oncelik: g.oncelik,
  };
}

/** Formdan eylem girdisine: boş metin → `null`. */
export function gorevGirdisi(f: GorevFormDurumu) {
  return {
    baslik: f.baslik,
    aciklama: f.aciklama || null,
    dolapId: f.dolapId || null,
    rafId: f.rafId || null,
    teslimGun: f.teslimGun || null,
    teslimSaat: f.teslimGun && f.teslimSaat ? f.teslimSaat : null,
    oncelik: f.oncelik,
  };
}

const SECIM =
  'focus-ring border-line bg-elevated text-primary min-h-11 w-full rounded-lg border px-3 text-base sm:text-sm';

export function GorevFormu({
  ilk,
  secenekler,
  kaydet,
  vazgec,
  sil,
}: {
  ilk: GorevFormDurumu;
  secenekler: readonly DolapSecenegi[];
  kaydet: (girdi: ReturnType<typeof gorevGirdisi>) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
  sil?: () => Promise<ApiResponse<unknown>>;
}) {
  const [f, setF] = useState(ilk);
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [silOnay, setSilOnay] = useState(false);
  const guncelle = (p: Partial<GorevFormDurumu>) => setF((o) => ({ ...o, ...p }));
  const raflar = secenekler.find((d) => d.id === f.dolapId)?.raflar ?? [];

  const calistir = async (is: () => Promise<ApiResponse<unknown>>) => {
    setBekliyor(true);
    setHata(null);
    const sonuc = await is();
    setBekliyor(false);
    if (!sonuc.ok) setHata({ mesaj: sonuc.error.message, alanlar: sonuc.error.fields ?? {} });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void calistir(() => kaydet(gorevGirdisi(f)));
      }}
    >
      <Alan id="gorev-baslik" etiket="Başlık" hata={hata?.alanlar.baslik}>
        {(b) => (
          <Input
            id="gorev-baslik"
            data-ilk-odak
            value={f.baslik}
            maxLength={160}
            onChange={(e) => guncelle({ baslik: e.target.value })}
            placeholder="Fizik ödevi 3"
            {...b}
          />
        )}
      </Alan>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan id="gorev-dolap" etiket="Dolap" hata={hata?.alanlar.dolapId}>
          {(b) => (
            <select
              id="gorev-dolap"
              className={SECIM}
              value={f.dolapId}
              onChange={(e) => guncelle({ dolapId: e.target.value, rafId: '' })}
              {...b}
            >
              <option value="">Masanın üstü (Kişisel)</option>
              {secenekler.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.ad}
                </option>
              ))}
            </select>
          )}
        </Alan>
        <Alan id="gorev-raf" etiket="Raf" hata={hata?.alanlar.rafId}>
          {(b) => (
            <select
              id="gorev-raf"
              className={SECIM}
              value={f.rafId}
              disabled={raflar.length === 0}
              onChange={(e) => guncelle({ rafId: e.target.value })}
              {...b}
            >
              <option value="">{raflar.length === 0 ? 'Bu dolapta raf yok' : 'Rafsız'}</option>
              {raflar.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.yol}
                </option>
              ))}
            </select>
          )}
        </Alan>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Alan id="gorev-teslim" etiket="Teslim günü" hata={hata?.alanlar.teslimGun}>
          {(b) => (
            <Input
              id="gorev-teslim"
              type="date"
              value={f.teslimGun}
              onChange={(e) => guncelle({ teslimGun: e.target.value })}
              {...b}
            />
          )}
        </Alan>
        <Alan id="gorev-saat" etiket="Saat" yardim="Boşsa gün boyu" hata={hata?.alanlar.teslimSaat}>
          {(b) => (
            <Input
              id="gorev-saat"
              type="time"
              value={f.teslimSaat}
              disabled={!f.teslimGun}
              onChange={(e) => guncelle({ teslimSaat: e.target.value })}
              {...b}
            />
          )}
        </Alan>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Öncelik</legend>
        <div role="radiogroup" aria-label="Öncelik" className="flex flex-wrap gap-2">
          {ONCELIK_SECENEKLERI.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={f.oncelik === o}
              onClick={() => guncelle({ oncelik: o })}
              className={cn(
                'focus-ring min-h-10 rounded-full border px-4 text-sm transition-colors',
                f.oncelik === o
                  ? 'border-accent bg-accent/12 text-primary font-medium'
                  : 'border-line bg-elevated text-body',
              )}
            >
              {ONCELIK_ADLARI[o]}
            </button>
          ))}
        </div>
      </fieldset>

      <Alan id="gorev-aciklama" etiket="Açıklama" hata={hata?.alanlar.aciklama}>
        {(b) => (
          <Textarea
            id="gorev-aciklama"
            rows={3}
            value={f.aciklama}
            maxLength={4000}
            onChange={(e) => guncelle({ aciklama: e.target.value })}
            {...b}
          />
        )}
      </Alan>

      {hata && <FormError>{hata.mesaj}</FormError>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={bekliyor}>
          Kaydet
        </Button>
        <Button variant="ghost" onClick={vazgec} disabled={bekliyor}>
          Vazgeç
        </Button>
        {sil && (
          <Button
            variant="danger"
            className="ml-auto"
            disabled={bekliyor}
            onClick={() => (silOnay ? void calistir(sil) : setSilOnay(true))}
          >
            {silOnay ? 'Eminim, sil' : 'Sil'}
          </Button>
        )}
      </div>
    </form>
  );
}
