'use client';

import {
  Activity,
  Briefcase,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils/cn';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

/** §4.2 — panel rotaları. Alt rotalar ilgili bölüm sayfasından açılır. */
const NAV_GROUPS: ReadonlyArray<{ title: string; items: readonly NavItem[] }> = [
  {
    title: 'Genel',
    items: [{ href: '/panel', label: 'Panel', icon: LayoutDashboard }],
  },
  {
    title: 'İş',
    items: [
      { href: '/panel/muhasebe', label: 'Muhasebe', icon: Wallet },
      { href: '/panel/isler', label: 'İşler', icon: Briefcase },
      { href: '/panel/musteriler', label: 'Müşteriler', icon: Users },
      { href: '/panel/mesajlar', label: 'Mesajlar', icon: Mail },
    ],
  },
  {
    title: 'Kişisel',
    items: [
      { href: '/panel/saglik', label: 'Sağlık', icon: Activity },
      { href: '/panel/spor', label: 'Spor', icon: Dumbbell },
      { href: '/panel/hayat', label: 'Hayat', icon: Sparkles },
    ],
  },
  {
    title: 'Site',
    items: [
      { href: '/panel/icerik/projeler', label: 'İçerik', icon: FileText },
      { href: '/panel/ayarlar', label: 'Ayarlar', icon: Settings },
    ],
  },
] as const;

/**
 * Panel kenar çubuğu — T-002 iskeleti.
 *
 * §5.2.1: panelde WebGL/shader/ağır efekt YOK. Buradaki tek hareket, 150ms'lik
 * renk geçişidir. Panel bir çalışma aracı; her etkileşim anlık hissetmeli.
 *
 * Mobilde kenar çubuğu gizlenir, gezinme Topbar'daki menüye taşınır (T-030).
 */
export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);

  return (
    <aside className="border-line bg-surface hidden w-60 shrink-0 border-r lg:block">
      <div className="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto p-4">
        <Link
          href="/panel"
          className="focus-ring rounded-btn font-display text-primary px-2 text-base font-bold"
        >
          Panel
        </Link>

        <nav aria-label="Panel menüsü" className="flex flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="tabular text-muted px-2 pb-1 text-[0.6875rem] tracking-wider uppercase">
                {group.title}
              </p>

              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'focus-ring ease-brand duration-micro rounded-btn flex items-center gap-2.5 px-2 py-2 text-sm transition-colors',
                          active
                            ? 'bg-elevated text-primary font-medium'
                            : 'text-body hover:bg-elevated hover:text-primary',
                        )}
                      >
                        <Icon
                          className={cn('size-4 shrink-0', active ? 'text-accent' : 'text-muted')}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
