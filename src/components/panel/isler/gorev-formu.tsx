'use client';

import { useState } from 'react';

import { Alan } from '@/components/panel/alan';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { ALAN_SIRASI, ALANLAR } from '@/lib/gorev/bicim';
import { GOREV_SINIRLARI } from '@/lib/schemas/gorev';
import { saatMetni } from '@/lib/takvim/bicim';
import { cn } from '@/lib/utils/cn';
import type { GorevDto } from '@/server/services/gorev';
import type { ApiResponse, IsAlani } from '@/types';

/**
 * GÖREV FORMU (ADR-050) — yeni ya da düzenleme. Doğrulama sunucuda (`gorevSchema`); alan hataları
 * alanın altında. Dört alan: başlık, alan, tarih/saat, etiket; not isteğe bağlı ve en altta.
 */

export interface GorevFormDurumu {
  baslik: string;
  alan: IsAlani;
  etiket: string;
  not: string;
  teslimGun: string;
  teslimSaat: string;
  /** ADR-058 */
  acil: boolean;
}

export function bosGorev(alan: IsAlani = 'KISISEL'): GorevFormDurumu {
  return { baslik: '', alan, etiket: '', not: '', teslimGun: '', teslimSaat: '', acil: false };
}

export function gorevdenForm(g: GorevDto): GorevFormDurumu {
  return {
    baslik: g.baslik,
    alan: g.alan,
    etiket: g.etiket ?? '',
    not: g.not ?? '',
    teslimGun: g.teslimGun ?? '',
    teslimSaat: g.teslimDakika !== null ? saatMetni(g.teslimDakika) : '',
    acil: g.acil,
  };
}

/** Formdan eylem girdisine: boş metin → `null`. */
export function gorevGirdisi(f: GorevFormDurumu) {
  return {
    baslik: f.baslik,
    alan: f.alan,
    etiket: f.etiket || null,
    not: f.not || null,
    teslimGun: f.teslimGun || null,
    teslimSaat: f.teslimGun && f.teslimSaat ? f.teslimSaat : null,
    acil: f.acil,
  };
}

export function GorevFormu({
  ilk,
  etiketOnerileri,
  kaydet,
  vazgec,
  sil,
}: {
  ilk: GorevFormDurumu;
  /** Daha önce kullanılan etiketler — yazarken öneri (müşteri/ders adı tekrar yazılmasın). */
  etiketOnerileri: readonly string[];
  kaydet: (girdi: ReturnType<typeof gorevGirdisi>) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
  sil?: () => Promise<ApiResponse<unknown>>;
}) {
  const [f, setF] = useState(ilk);
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [silOnay, setSilOnay] = useState(false);
  const guncelle = (p: Partial<GorevFormDurumu>) => setF((o) => ({ ...o, ...p }));

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
      <Alan id="gorev-baslik" etiket="Ne yapılacak?" hata={hata?.alanlar.baslik}>
        {(b) => (
          <Input
            id="gorev-baslik"
            data-ilk-odak
            value={f.baslik}
            maxLength={GOREV_SINIRLARI.baslik}
            onChange={(e) => guncelle({ baslik: e.target.value })}
            placeholder="Kozmos reels kurgusu"
            {...b}
          />
        )}
      </Alan>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Alan</legend>
        <div role="radiogroup" aria-label="Alan" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALAN_SIRASI.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={f.alan === a}
              onClick={() => guncelle({ alan: a })}
              className={cn(
                'focus-ring flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                f.alan === a
                  ? 'border-accent bg-accent/10 text-primary font-medium'
                  : 'border-line bg-elevated text-body',
              )}
            >
              <span aria-hidden="true" className={cn('size-2 rounded-full', ALANLAR[a].nokta)} />
              {ALANLAR[a].ad}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Alan id="gorev-gun" etiket="Gün" hata={hata?.alanlar.teslimGun}>
          {(b) => (
            <Input
              id="gorev-gun"
              type="date"
              value={f.teslimGun}
              onChange={(e) =>
                guncelle({
                  teslimGun: e.target.value,
                  ...(e.target.value ? {} : { teslimSaat: '' }),
                })
              }
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

      <Alan
        id="gorev-etiket"
        etiket="Etiket"
        yardim="Müşteri ya da ders adı — isteğe bağlı"
        hata={hata?.alanlar.etiket}
      >
        {(b) => (
          <>
            <Input
              id="gorev-etiket"
              list="gorev-etiketleri"
              value={f.etiket}
              maxLength={GOREV_SINIRLARI.etiket}
              onChange={(e) => guncelle({ etiket: e.target.value })}
              placeholder="Kozmos"
              {...b}
            />
            <datalist id="gorev-etiketleri">
              {etiketOnerileri.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </>
        )}
      </Alan>

      <label
        htmlFor="gorev-acil"
        className="border-line bg-elevated flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm"
      >
        <input
          id="gorev-acil"
          type="checkbox"
          checked={f.acil}
          onChange={(e) => guncelle({ acil: e.target.checked })}
          className="accent-warning size-4"
        />
        <span className="text-primary">Acil</span>
        <span className="text-muted text-xs">sokakta dikkat panosuna düşer</span>
      </label>

      <Alan id="gorev-not" etiket="Not" hata={hata?.alanlar.not}>
        {(b) => (
          <Textarea
            id="gorev-not"
            rows={2}
            value={f.not}
            maxLength={GOREV_SINIRLARI.not}
            onChange={(e) => guncelle({ not: e.target.value })}
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
