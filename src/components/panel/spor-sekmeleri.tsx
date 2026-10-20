import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

/**
 * SPOR ALT GEZİNMESİ — §4.2 `/panel/spor`, T-114.
 *
 * Kenar menüsünde TEK satır var (`Spor`), ama modülün üç ayrı listesi var:
 * antrenmanlar, egzersiz kütüphanesi, rekorlar. Üçünü menüye koymak "Kişisel"
 * grubunu şişirirdi; hiç koymamak ise kütüphaneye ve rekorlara yalnızca adres
 * çubuğundan ulaşılabilmesi demekti — yani ölü bir yüzey.
 *
 * Sekme görünümü görünüm sekmeleriyle (müşteriler, sağlık aralığı) aynı dil,
 * ama bunlar AYRI SAYFALAR: `aria-current="page"` tam olarak bunu söylüyor.
 *
 * SUNUCU BİLEŞENİ — yalnızca bağlantı üretiyor.
 */

const SEKMELER = [
  { anahtar: 'antrenmanlar', etiket: 'Antrenmanlar', href: '/panel/spor' },
  { anahtar: 'egzersizler', etiket: 'Egzersizler', href: '/panel/spor/egzersizler' },
  { anahtar: 'rekorlar', etiket: 'Rekorlar', href: '/panel/spor/rekorlar' },
] as const;

export type SporSekmesi = (typeof SEKMELER)[number]['anahtar'];

export function SporSekmeleri({ secili }: { secili: SporSekmesi }) {
  return (
    <nav aria-label="Spor bölümleri" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex min-w-max gap-1.5">
        {SEKMELER.map((s) => {
          const aktif = s.anahtar === secili;
          return (
            <li key={s.anahtar}>
              <Link
                href={s.href}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
                  aktif
                    ? 'border-accent/40 bg-accent/12 text-accent-soft'
                    : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                )}
              >
                {s.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
