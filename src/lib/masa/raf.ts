/**
 * RAF AĞACI (ADR-049 M2) — saf; dolap ekranı (istemci) ve görev formu seçicisi (sunucu) aynı
 * sırayı görür.
 */
export interface RafDto {
  id: string;
  ad: string;
  ustRafId: string | null;
  sira: number;
}

export interface RafYolu {
  id: string;
  /** "Derslerim › Fizik". */
  yol: string;
  ad: string;
  derinlik: number;
}

/** Rafları ağaç sırasıyla "Üst › Alt" yollarına açar (saf). */
export function rafYollari(raflar: readonly RafDto[]): RafYolu[] {
  const cocuklar = new Map<string | null, RafDto[]>();
  for (const r of raflar) {
    const k = cocuklar.get(r.ustRafId) ?? [];
    k.push(r);
    cocuklar.set(r.ustRafId, k);
  }
  const sonuc: RafYolu[] = [];
  const gez = (ust: string | null, onek: string, derinlik: number) => {
    for (const r of cocuklar.get(ust) ?? []) {
      const yol = onek ? `${onek} › ${r.ad}` : r.ad;
      sonuc.push({ id: r.id, yol, ad: r.ad, derinlik });
      gez(r.id, yol, derinlik + 1);
    }
  };
  gez(null, '', 0);
  return sonuc;
}
