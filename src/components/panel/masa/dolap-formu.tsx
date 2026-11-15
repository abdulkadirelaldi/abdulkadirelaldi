'use client';

import { useState } from 'react';

import { Alan } from '@/components/panel/alan';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { KATMAN_SIRASI, TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { cn } from '@/lib/utils/cn';
import type { ApiResponse, TakvimKatman } from '@/types';

export interface DolapFormDurumu {
  ad: string;
  emoji: string;
  katman: TakvimKatman;
}

const EMOJILER = ['🎓', '🎬', '🚄', '💼', '📚', '🏠', '💡', '🗄️'];

/**
 * DOLAP FORMU (ADR-049 M2). Katman, dolaptaki görevlerin takvimde hangi düğmeyle görüneceğini
 * belirler — formda bu yüzden açıkça söylenir.
 */
export function DolapFormu({
  ilk,
  kaydet,
  vazgec,
  ek,
}: {
  ilk: DolapFormDurumu;
  kaydet: (girdi: DolapFormDurumu) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
  /** Düzenlemede arşivle/sil düğmeleri. */
  ek?: React.ReactNode;
}) {
  const [f, setF] = useState(ilk);
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBekliyor(true);
        setHata(null);
        const sonuc = await kaydet(f);
        setBekliyor(false);
        if (!sonuc.ok) setHata({ mesaj: sonuc.error.message, alanlar: sonuc.error.fields ?? {} });
      }}
    >
      <Alan id="dolap-ad" etiket="Dolap adı" hata={hata?.alanlar.ad}>
        {(b) => (
          <Input
            id="dolap-ad"
            data-ilk-odak
            value={f.ad}
            maxLength={60}
            onChange={(e) => setF({ ...f, ad: e.target.value })}
            placeholder="Samsun Üniversitesi"
            {...b}
          />
        )}
      </Alan>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Simge</legend>
        <div role="radiogroup" aria-label="Simge" className="flex flex-wrap gap-2">
          {EMOJILER.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={f.emoji === e}
              aria-label={e}
              onClick={() => setF({ ...f, emoji: e })}
              className={cn(
                'focus-ring flex size-11 items-center justify-center rounded-full border text-lg',
                f.emoji === e ? 'border-accent bg-accent/12' : 'border-line bg-elevated',
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary text-sm font-medium">Takvim katmanı</legend>
        <p className="text-muted -mt-1 text-xs">
          Bu dolaptaki görevlerin teslimleri takvimde bu katmanda görünür.
        </p>
        <div role="radiogroup" aria-label="Takvim katmanı" className="flex flex-wrap gap-2">
          {KATMAN_SIRASI.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={f.katman === k}
              onClick={() => setF({ ...f, katman: k })}
              className={cn(
                'focus-ring flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm',
                f.katman === k
                  ? 'border-accent bg-accent/12 text-primary font-medium'
                  : 'border-line bg-elevated text-body',
              )}
            >
              <span aria-hidden="true">{TAKVIM_KATMANLARI[k].emoji}</span>
              {TAKVIM_KATMANLARI[k].ad}
            </button>
          ))}
        </div>
      </fieldset>

      {hata && <FormError>{hata.mesaj}</FormError>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={bekliyor}>
          Kaydet
        </Button>
        <Button variant="ghost" onClick={vazgec} disabled={bekliyor}>
          Vazgeç
        </Button>
        {ek}
      </div>
    </form>
  );
}
