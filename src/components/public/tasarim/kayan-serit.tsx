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
        // `kayan-serit-kap`: ekran dışındayken çizim ATLANIR (globals.css,
        // content-visibility) — şerit görünmüyorken GPU'yu meşgul etmesin.
        'kayan-serit-kap group/serit relative overflow-hidden motion-reduce:overflow-x-auto',
        className,
      )}
    >
      <div
        className={cn(
          // `will-change`: şerit kendi katmanında; kayma yalnızca bileşimci
          // (compositor) işi, her karede yeniden çizim yok.
          'animate-kayan-serit flex w-max will-change-transform',
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
      {/*
        KENAR SOLMASI — `mask-image` DEĞİL, zemin renginde iki gradyan örtü.
        ÖLÇÜLDÜ: hareketli içeriği maskelemek, tarayıcıyı tüm şeridi her karede
        ayrı bir yüzeyde yeniden çizmeye zorluyordu — ana sayfada karelerin
        %40'ı "kısmi" sunuldu (kaydırma takılması), raster 107 ms. Örtüyle
        kısmi kare %0, raster 32 ms. Görsel sonuç aynı: kenarlar zemine eriyor.
      */}
      {solgun && (
        <>
          <div
            aria-hidden="true"
            className="from-canvas pointer-events-none absolute inset-y-0 left-0 w-[8%] bg-gradient-to-r to-transparent"
          />
          <div
            aria-hidden="true"
            className="from-canvas pointer-events-none absolute inset-y-0 right-0 w-[8%] bg-gradient-to-l to-transparent"
          />
        </>
      )}
    </div>
  );
}
