'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { birincilSiniflari, ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import { DIL_ADI, DILLER, type Dil } from '@/i18n/diller';
import { cozumle, yol, type Sayfa } from '@/i18n/rotalar';
import type { Sozluk } from '@/i18n/sozluk';
import { cn } from '@/lib/utils/cn';

/** §4.1 — menüdeki public sayfalar; adresler dile göre `yol()`dan (ADR-046). */
const MENU: readonly Sayfa[] = ['hakkimda', 'projeler', 'blog', 'hizmetler', 'iletisim'];

/**
 * Dil seçicinin hedefi. Liste sayfalarında karşılık adres doğrudan hesaplanır.
 * Proje/yazı DETAYINDA slug dile göre değişebildiği için karşılığı sunucu
 * bulur (`/api/v1/dil` — çeviri anahtarıyla; yoksa liste sayfasına düşer).
 */
export function dilHedefi(pathname: string, hedef: Dil): string {
  const c = cozumle(pathname);
  if (c.tur !== 'sayfa') return yol(hedef, 'anasayfa');
  if (!c.slug) return yol(hedef, c.sayfa);
  const p = new URLSearchParams({ hedef, yol: pathname });
  return `/api/v1/dil?${p.toString()}`;
}

/** Navbar'ın ihtiyaç duyduğu metinler — sözlüğün tamamı istemciye inmesin. */
export type NavbarMetni = Pick<Sozluk, 'nav' | 'sayfaAdi'>;

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
export function Navbar({ dil, metin }: { dil: Dil; metin: NavbarMetni }) {
  const pathname = usePathname();
  const { nav, sayfaAdi } = metin;
  const baglantilar = MENU.map((sayfa) => ({ href: yol(dil, sayfa), label: sayfaAdi[sayfa] }));
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
          ? 'border-line bg-canvas/90 border-b backdrop-blur'
          : 'border-b border-transparent',
      )}
    >
      <nav
        aria-label={nav.anaMenu}
        className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8"
      >
        <Link
          href={yol(dil, 'anasayfa')}
          aria-label={nav.anaSayfa}
          className="focus-ring rounded-btn text-primary relative z-10 text-lg font-semibold tracking-tight"
        >
          AE<span className="text-accent">.</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-8 md:flex">
          {baglantilar.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch
                aria-current={aktif(link.href) ? 'page' : undefined}
                className={cn(
                  'focus-ring rounded-btn relative block py-1 text-sm font-medium transition-colors',
                  aktif(link.href) ? 'text-accent' : 'text-body hover:text-primary',
                )}
              >
                {link.label}
                {aktif(link.href) && (
                  <span
                    aria-hidden="true"
                    className="bg-accent absolute inset-x-0 -bottom-1 h-0.5"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <DilSecici
          dil={dil}
          pathname={pathname}
          etiket={nav.dilSecici}
          className="hidden md:flex"
        />

        <Link
          href={yol(dil, 'iletisim')}
          className={birincilSiniflari('sm', 'hidden md:inline-flex')}
        >
          {nav.cta}
        </Link>

        <button
          type="button"
          onClick={() => setAcik((a) => !a)}
          aria-expanded={acik}
          aria-controls="mobil-menu"
          aria-label={acik ? nav.menuyuKapat : nav.menuyuAc}
          className={ikincilSiniflari('sm', 'relative z-10 ml-auto md:hidden')}
        >
          {acik ? nav.kapat : nav.menu}
        </button>
      </nav>

      {acik && (
        <div
          id="mobil-menu"
          className="bg-canvas fixed inset-0 flex flex-col justify-between px-4 pt-20 pb-10 md:hidden"
        >
          <ul className="flex flex-col gap-2">
            {baglantilar.map((link) => (
              <li key={link.href} className="border-line border-b">
                <Link
                  href={link.href}
                  prefetch
                  aria-current={aktif(link.href) ? 'page' : undefined}
                  className={cn(
                    'focus-ring block py-4 text-2xl font-semibold',
                    aktif(link.href) ? 'text-accent' : 'text-primary',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-6">
            <DilSecici dil={dil} pathname={pathname} etiket={nav.dilSecici} />
            <Link href={yol(dil, 'iletisim')} className={birincilSiniflari('lg', 'w-full')}>
              {nav.cta}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Dil seçici — TR · EN · DE. Her dil KENDİ adıyla `title`/`lang` taşıyor
 * (ziyaretçi kendi dilini arar; ekran okuyucu doğru telaffuz eder). Düz `<a>`:
 * dil değişimi tam sayfa yüklemesi — yeni dilin `<html lang>`ı ve metadata'sı
 * sunucudan baştan gelsin.
 */
function DilSecici({
  dil,
  pathname,
  etiket,
  className,
}: {
  dil: Dil;
  pathname: string;
  etiket: string;
  className?: string;
}) {
  return (
    <ul aria-label={etiket} className={cn('flex items-center gap-1', className)}>
      {DILLER.map((d) => (
        <li key={d}>
          <a
            href={dilHedefi(pathname, d)}
            hrefLang={d}
            lang={d}
            title={DIL_ADI[d]}
            aria-current={d === dil ? 'true' : undefined}
            className={cn(
              'focus-ring rounded-btn inline-flex h-8 items-center px-2 text-sm font-medium uppercase transition-colors',
              d === dil ? 'text-primary bg-surface' : 'text-muted hover:text-primary',
            )}
          >
            {d}
            <span className="sr-only"> — {DIL_ADI[d]}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
