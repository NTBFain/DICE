'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from './AuthContext';
import { Home, LayoutTemplate, Users, Gavel, LayoutDashboard, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Navigation');

  // Hide public bottom nav when in admin dashboard to prevent overlapping with admin dock
  if (pathname.startsWith('/dashboard/admin')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/portfolio', label: t('portfolio'), icon: LayoutTemplate },
    { href: '/characters', label: t('characters'), icon: Users },
    { href: '/auctions', label: t('auctions'), icon: Gavel },
  ];

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 pointer-events-none">
      <nav className="pointer-events-auto bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800/80 rounded-2xl shadow-xl flex items-center justify-around p-1.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                active
                  ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-600/10 dark:bg-blue-600/15 scale-105'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
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
            href={user.is_admin ? '/dashboard/admin' : '/dashboard/client'}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              pathname.startsWith('/dashboard')
                ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-600/10 dark:bg-blue-600/15 scale-105'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{user.is_admin ? t('adminPanel') : t('myOrders')}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              pathname === '/login'
                ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-600/10 dark:bg-blue-600/15 scale-105'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
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
