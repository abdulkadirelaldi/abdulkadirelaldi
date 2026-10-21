'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { gradyanSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { cn } from '@/lib/utils/cn';

/**
 * §4.1 — public rotalar.
 *
 * `hazir`: sayfa AÇILDI mı. Açılmamış rotayı ön çekmek 404 üretir ve
 * Lighthouse'un `errors-in-console` denetimini düşürür (T-002b, T-023c).
 * Bugün hepsi yayında; alan bir sonraki yeni sayfa için duruyor.
 */
const NAV_LINKS = [
  { href: '/hakkimda', label: 'Hakkımda', hazir: true },
  { href: '/projeler', label: 'Projeler', hazir: true },
  { href: '/blog', label: 'Blog', hazir: true },
  { href: '/hizmetler', label: 'Hizmetler', hazir: true },
  { href: '/iletisim', label: 'İletişim', hazir: true },
] as const;

/*
 * ÖN ÇEKME `true` (tam sayfa) — ÖLÇÜLDÜ: public sayfalar istek başına render
 * ediliyor (CSP nonce'u statik sayfaya izin vermiyor) ve Next varsayılan ön
 * çekmede dinamik rotanın yalnızca yükleme sınırını alıyor; menü tıklaması
 * sunucuyu bekliyordu. 4× CPU + Fast 4G'de Projeler/Hakkımda/İletişim geçişi
 * ~0.8–1 sn idi. Tam ön çekmeyle sayfa tıklamadan önce hazır.
 * Bedel: menüdeki beş sayfanın RSC yükü (sayfa başına ~20–35 kB) ilk yükten
 * SONRA, boşta iken iniyor — LCP'ye yazılmıyor.
 */

/** Bu kadar pikselden sonra başlık zemin alır ve aşağı kaydırmada gizlenir. */
const ESIK = 24;

/**
 * Public navigasyon — ADR-045.
 *
 * DAVRANIŞ:
 *   - Sayfanın tepesinde ŞEFFAF; hero ile bütünleşiyor (örnekteki gibi).
 *   - Kaydırınca bulanık zemin alıyor; AŞAĞI kaydırırken gizleniyor, YUKARI
 *     kaydırınca geri geliyor — okurken ekranı kaplamıyor, istenince orada.
 *   - Klavyeyle içine odaklanılırsa (`focus-within`) gizliyken de görünüyor:
 *     sekmeyle gelen kullanıcı görünmez bir menüde dolaşmasın.
 *
 * MOBİL: tam ekran katman, dev bağlantılar. Açıkken sayfa kaydırması kilitli
 * ve Escape kapatıyor. Katman DOM'dan çıkarılıyor (kapalıyken odaklanılamaz).
 *
 * JS yüklenmeden de gezinilebilir: bağlantılar düz `<a>`.
 */
export function Navbar() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [kaydirildi, setKaydirildi] = useState(false);
  const [gizli, setGizli] = useState(false);
  const sonY = useRef(0);

  useEffect(() => {
    setAcik(false);
  }, [pathname]);

  useEffect(() => {
    const dinle = () => {
      const y = window.scrollY;
      setKaydirildi(y > ESIK);
      setGizli(y > 160 && y > sonY.current);
      sonY.current = y;
    };
    dinle();
    window.addEventListener('scroll', dinle, { passive: true });
    return () => window.removeEventListener('scroll', dinle);
  }, []);

  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const kapat = (olay: KeyboardEvent) => olay.key === 'Escape' && setAcik(false);
    window.addEventListener('keydown', kapat);
    return () => {
      document.body.style.overflow = onceki;
      window.removeEventListener('keydown', kapat);
    };
  }, [acik]);

  const aktif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      data-yazdirmada-gizle
      className={cn(
        // `translate` YALNIZCA gizlenirken: dönüşüm taşıyan ata, mobil menünün
        // `fixed inset-0` katmanını kendi kutusuna hapseder (tam ekran olmaz).
        // Aynı sebeple açıkken bulanıklık da yok (`backdrop-filter` de öyle).
        'ease-brand fixed inset-x-0 top-0 z-50 transition-[translate,background-color,border-color] duration-500 focus-within:translate-none',
        gizli && !acik && '-translate-y-full',
        kaydirildi && !acik
          ? 'border-line/60 bg-canvas/70 border-b backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav
        aria-label="Ana menü"
        className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:h-20 md:px-8"
      >
        <Link
          href="/"
          aria-label="Ana sayfa"
          className="focus-ring rounded-btn font-dev text-primary relative z-10 text-xl font-black tracking-tight"
        >
          AE<span className="text-gradient-vurgu">.</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={link.hazir ? true : false}
                aria-current={aktif(link.href) ? 'page' : undefined}
                className={cn(
                  'group focus-ring rounded-btn relative block overflow-hidden py-1 text-[0.7rem] font-semibold tracking-[0.18em] uppercase',
                  aktif(link.href) ? 'text-primary' : 'text-body hover:text-primary',
                )}
              >
                {/* Metin yukarı kayıp alttan kopyası geliyor — "yuvarlanan" hover. */}
                <span className="ease-brand block transition-transform duration-300 group-hover:-translate-y-full">
                  {link.label}
                </span>
                <span
                  aria-hidden="true"
                  className="ease-brand absolute inset-x-0 top-full block py-1 transition-transform duration-300 group-hover:-translate-y-full"
                >
                  {link.label}
                </span>
                {aktif(link.href) && (
                  <span
                    aria-hidden="true"
                    className="bg-gradient-vurgu rounded-pill absolute inset-x-0 bottom-0 h-px"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/iletisim" className={gradyanSiniflari('sm', 'hidden md:inline-flex')}>
          Birlikte çalışalım
        </Link>

        <button
          type="button"
          onClick={() => setAcik((a) => !a)}
          aria-expanded={acik}
          aria-controls="mobil-menu"
          aria-label={acik ? 'Menüyü kapat' : 'Menüyü aç'}
          className="focus-ring rounded-pill border-line-strong text-primary relative z-10 ml-auto inline-flex h-10 items-center gap-2 border px-4 text-[0.7rem] font-semibold tracking-[0.18em] uppercase md:hidden"
        >
          {acik ? 'Kapat' : 'Menü'}
        </button>
      </nav>

      {acik && (
        <div
          id="mobil-menu"
          className="bg-canvas animate-sayfa-giris fixed inset-0 flex flex-col justify-between px-4 pt-24 pb-10 [animation-duration:0.4s] md:hidden"
        >
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link, sira) => (
              <li key={link.href} className="border-line border-b">
                <Link
                  href={link.href}
                  prefetch={link.hazir ? true : false}
                  aria-current={aktif(link.href) ? 'page' : undefined}
                  className={cn(
                    'focus-ring dev-baslik flex items-baseline justify-between py-4 text-4xl',
                    aktif(link.href) ? 'text-gradient-vurgu' : 'text-primary',
                  )}
                >
                  {link.label}
                  <span className="tabular text-muted text-xs font-normal tracking-normal">
                    0{sira + 1}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/iletisim" className={gradyanSiniflari('lg', 'w-full')}>
            Birlikte çalışalım
          </Link>
        </div>
      )}
    </header>
  );
}
