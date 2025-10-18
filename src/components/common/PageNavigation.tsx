'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Telescope, Users, Camera, Info, GitCompare, Sparkles } from 'lucide-react';

const navigationItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/details', label: 'Details', icon: TrendingUp },
  { href: '/comets', label: 'Comets', icon: Sparkles },
  { href: '/predictions', label: 'Predictions', icon: GitCompare },
  { href: '/observations', label: 'Observations', icon: Telescope },
  // { href: '/observers', label: 'Observers', icon: Users }, // Temporarily hidden
  { href: '/gallery', label: 'Gallery', icon: Camera },
  { href: '/about', label: 'About', icon: Info }
];

export default function PageNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
      <div className="container mx-auto px-2 sm:px-6">
        <nav className="flex items-center justify-center gap-1 overflow-x-auto py-2 scrollbar-thin">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`
                  flex items-center gap-2 px-3 sm:px-6 py-3 md:py-2 rounded-lg
                  font-medium text-xs sm:text-sm whitespace-nowrap
                  transition-all duration-200
                  ${active
                    ? 'bg-[var(--color-interactive-primary)] text-white shadow-lg'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  }
                `}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}