'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from './AuthContext';
import { Home, LayoutTemplate, Users, Gavel, LayoutDashboard, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Navigation');

  // Hide public bottom nav when in admin or artist dashboard to prevent overlapping with floating dock
  if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/artist')) {
    return null;
  }

  const navItems = [
    { href: '/', label: t('artists'), icon: Home, exact: true },
    { href: '/portfolio', label: t('portfolio'), icon: LayoutTemplate },
    { href: '/characters', label: t('characters'), icon: Users },
    { href: '/auctions', label: t('auctions'), icon: Gavel },
  ];

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const getDashboardHref = () => {
    if (user?.is_admin) return '/dashboard/admin';
    if (user?.is_artist) return '/dashboard/artist';
    return '/dashboard/client';
  };

  const getDashboardLabel = () => {
    if (user?.is_admin) return t('adminPanel');
    if (user?.is_artist) return 'Artist Studio';
    return t('myOrders');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pt-1 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto bg-[var(--bg-surface,#121215)]/95 text-[var(--text-primary,#f4f4f5)] backdrop-blur-xl border border-[var(--border-subtle,#27272a)] rounded-2xl shadow-2xl flex items-center justify-around p-1.5 max-w-md mx-auto transition-colors duration-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                active
                  ? 'text-[var(--accent-primary,#3b82f6)] font-extrabold bg-[var(--accent-primary,#3b82f6)]/15 border border-[var(--accent-primary,#3b82f6)]/30 scale-105 shadow-xs'
                  : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Dashboard / Login Button */}
        {user ? (
          <Link
            href={getDashboardHref()}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              pathname.startsWith('/dashboard')
                ? 'text-[var(--accent-primary,#3b82f6)] font-extrabold bg-[var(--accent-primary,#3b82f6)]/15 border border-[var(--accent-primary,#3b82f6)]/30 scale-105 shadow-xs'
                : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{getDashboardLabel()}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              pathname === '/login'
                ? 'text-[var(--accent-primary,#3b82f6)] font-extrabold bg-[var(--accent-primary,#3b82f6)]/15 border border-[var(--accent-primary,#3b82f6)]/30 scale-105 shadow-xs'
                : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <UserCircle className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{t('login')}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
