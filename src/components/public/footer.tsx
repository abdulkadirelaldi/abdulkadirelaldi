import Link from 'next/link';

import { SITE_NAME } from '@/lib/constants';

/** `hazir`: sayfa AÇILDI mı. Açılmamış rotayı ön çekmek 404 üretir (T-002b). */
const FOOTER_LINKS = [
  { href: '/hakkimda', label: 'Hakkımda', hazir: true },
  { href: '/projeler', label: 'Projeler', hazir: true },
  { href: '/blog', label: 'Blog', hazir: true },
  { href: '/hizmetler', label: 'Hizmetler', hazir: true },
  { href: '/iletisim', label: 'İletişim', hazir: true },
  { href: '/cv', label: 'CV', hazir: true },
] as const;

/**
 * Public alt bilgi — Sunucu Bileşeni, efekt yok.
 *
 * Kıyı Medya bağlantısı ortam değişkeninden okunur (§12); adres koda gömülmez.
 * Telif yılı sunucuda üretilir — istemcide üretilseydi hidrasyon uyuşmazlığı riski olurdu.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const kiyiMedyaUrl = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

  return (
    <footer data-yazdirmada-gizle className="border-line bg-surface/40 mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <p className="font-display text-primary text-base font-bold">{SITE_NAME}</p>
          <p className="text-muted text-sm">
            Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum.
          </p>
        </div>

        <nav aria-label="Alt bilgi menüsü">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={link.hazir ? undefined : false}
                  className="focus-ring ease-brand duration-micro rounded-btn text-body hover:text-primary text-sm transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-line border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-xs">
            <span className="tabular">{year}</span> · {SITE_NAME}
          </p>
          <p className="text-muted text-xs">
            Ticari işler{' '}
            <a
              href={kiyiMedyaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-btn text-accent-soft"
            >
              Kıyı Medya
            </a>{' '}
            üzerinden yürür.
          </p>
        </div>
      </div>
    </footer>
  );
}
