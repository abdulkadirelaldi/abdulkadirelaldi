import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type KayanSeritProps = {
  /** Şeridin öğeleri. İki kez basılır; ikinci kopya ekran okuyucudan gizli. */
  children: ReactNode;
  /** Bir tam turun süresi (sn). Öğe sayısı arttıkça büyütülmeli. */
  sure?: number;
  /** `true`: sağa doğru akar (iki sıralı şeritte ikinci sıra için). */
  ters?: boolean;
  /** Üzerine gelince dursun mu — okunacak içerik taşıyan şeritlerde açık. */
  durdur?: boolean;
  /** Kenarlarda zemine eriyen maske. */
  solgun?: boolean;
  className?: string;
  /** Ekran okuyucuya şeridin ne olduğunu söyleyen etiket. */
  etiket?: string;
};

/**
 * ADR-045 — sonsuz kayan şerit. SAF CSS: JS yok, sunucuda çizilir.
 *
 * İçerik iki kez basılıp kap -50% kaydırılıyor; ikinci kopya ilkinin yerine
 * oturduğunda döngü dikişsiz başa sarıyor. İkinci kopya `aria-hidden` — aynı
 * listeyi iki kez okutmamak için.
 *
 * Hareket azaltılmışsa globals.css'teki blok animasyonu tek kareye indiriyor;
 * şerit durağan kalıyor ve taşan kısım yatay kaydırmayla erişilebilir.
 */
export function KayanSerit({
  children,
  sure = 40,
  ters = false,
  durdur = false,
  solgun = true,
  className,
  etiket,
}: KayanSeritProps) {
  return (
    <div
      role={etiket ? 'region' : undefined}
      aria-label={etiket}
      className={cn(
        'group/serit relative overflow-hidden motion-reduce:overflow-x-auto',
        solgun && '[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]',
        className,
      )}
    >
      <div
        className={cn(
          'animate-kayan-serit flex w-max',
          ters && '[animation-direction:reverse]',
          durdur && 'group-hover/serit:[animation-play-state:paused]',
        )}
        style={{ ['--serit-sure' as string]: `${sure}s` }}
      >
        <div className="flex shrink-0">{children}</div>
        {/* `inert`: kopyadaki bağlantı/odaklanabilir öğe sekmeyle de erişilmesin
            (aria-hidden + odaklanabilir = axe `aria-hidden-focus` ihlali). */}
        <div className="flex shrink-0" aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  );
}
