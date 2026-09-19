import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';

/**
 * Sayfalama — `PagedResult` için.
 *
 * T-041f'te mesaj listesinde satır içinde yazılmıştı; içerik ekranlarıyla
 * birlikte ÜÇÜNCÜ kullanım oldu ve ortak bileşene taşındı.
 *
 * SINIRDAKİ DÜĞME BAĞLANTI OLARAK ÇİZİLMİYOR, devre dışı bir metne dönüyor:
 * tıklanıp aynı sayfada kalan bir bağlantı, ölü bağlantının sayfalamadaki
 * hâli olurdu.
 *
 * SERVER COMPONENT — yalnızca bağlantı üretiyor.
 */
export function Sayfalama({
  sayfa,
  perPage,
  toplam,
  yol,
}: {
  sayfa: number;
  perPage: number;
  toplam: number;
  /** Sayfa numarasından adres üretir. */
  yol: (sayfa: number) => string;
}) {
  const sonSayfa = Math.max(1, Math.ceil(toplam / perPage));
  if (sonSayfa <= 1) return null;

  return (
    <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-muted text-sm">
        Sayfa {sayfa} / {sonSayfa}
      </p>

      <div className="flex gap-2">
        {sayfa > 1 ? (
          <Link
            href={yol(sayfa - 1)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Önceki
          </Link>
        ) : (
          <span className="text-muted rounded-btn border-line border px-3 py-2 text-sm opacity-60">
            Önceki
          </span>
        )}

        {sayfa < sonSayfa ? (
          <Link
            href={yol(sayfa + 1)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Sonraki
          </Link>
        ) : (
          <span className="text-muted rounded-btn border-line border px-3 py-2 text-sm opacity-60">
            Sonraki
          </span>
        )}
      </div>
    </nav>
  );
}
