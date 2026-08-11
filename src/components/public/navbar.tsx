'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils/cn';

/**
 * §4.1 — public rotalar.
 *
 * T-002b: bu sayfaların hiçbiri henüz YOK (F2/T-021'de açılacak). `next/link`
 * varsayılan olarak görünür bağlantıları önden çeker; olmayan rotayı çekince
 * 404 döner ve tarayıcı bunu konsola HATA olarak yazar — Lighthouse'un
 * `errors-in-console` denetimi bu yüzden sıfır almıştı.
 *
 * Sayfalar açıldığında aşağıdaki `prefetch={false}` KALDIRILMALI; ön çekme
 * gezinmeyi belirgin biçimde hızlandırır.
 */
const NAV_LINKS = [
  { href: '/hakkimda', label: 'Hakkımda' },
  { href: '/projeler', label: 'Projeler' },
  { href: '/blog', label: 'Blog' },
  { href: '/hizmetler', label: 'Hizmetler' },
  { href: '/iletisim', label: 'İletişim' },
] as const;

/**
 * Public navigasyon — T-002 iskeleti.
 *
 * GooeyNav (§5.1) T-020'de bu bileşenin İÇİNE, masaüstü bağlantı listesinin
 * üstüne bir gösterge katmanı olarak eklenecek. Buradaki `<a>` listesi kalır:
 * JS yüklenmeden de gezinilebilir olması gerekiyor.
 */
export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Rota değişince mobil menü açık kalmasın
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-line bg-canvas/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <nav aria-label="Ana menü" className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="focus-ring rounded-btn font-display text-primary text-lg font-bold tracking-tight"
        >
          Abdulkadir<span className="text-accent-soft">.</span>
        </Link>

        {/* Masaüstü bağlantıları */}
        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'focus-ring ease-brand duration-micro rounded-btn relative px-3 py-2 text-sm transition-colors',
                  isActive(link.href) ? 'text-primary' : 'text-body hover:text-primary',
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  // §3.1 — gradient: aktif nav göstergesi
                  <span
                    aria-hidden="true"
                    className="bg-gradient-accent rounded-pill absolute inset-x-3 -bottom-px h-0.5"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobil-menu"
            aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            className="focus-ring rounded-btn border-line bg-surface text-body inline-flex size-10 items-center justify-center border md:hidden"
          >
            {isOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </nav>

      {/* Mobil menü — açıkken DOM'dan çıkarılır, odak tuzağı gerekmez */}
      {isOpen && (
        <div id="mobil-menu" className="border-line bg-surface border-t md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col p-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'focus-ring rounded-btn block px-3 py-3 text-sm',
                    isActive(link.href)
                      ? 'bg-elevated text-primary'
                      : 'text-body hover:bg-elevated hover:text-primary',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
