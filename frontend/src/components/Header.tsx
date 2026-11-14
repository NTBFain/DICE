'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useAuth } from './AuthContext';
import { LayoutTemplate, UserCircle, LogOut, LayoutDashboard, Gavel, Globe, Users } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header() {
  const { user, logoutUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Navigation');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileMenuOpen(false);
      mobileMenuButton.current?.focus();
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logoutUser();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const switchLanguage = () => {
    setMobileMenuOpen(false);
    const nextLocale = locale === 'en' ? 'th' : 'en';
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: nextLocale });
  };

  return (
    <header className="border-b border-[var(--border-subtle,#27272a)] bg-[var(--bg-surface,#121215)]/90 text-[var(--text-primary,#f4f4f5)] backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-[var(--text-primary,#f4f4f5)] flex items-center hover:opacity-90 transition-all group">
          <span className="group-hover:scale-105 transition-transform duration-300">DI<span className="text-[var(--accent-primary,#3b82f6)] inline-block group-hover:rotate-12 transition-transform duration-300">CE</span></span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 items-center">
          <Link
            href="/"
            className={`text-sm font-medium transition-all flex items-center gap-1.5 hover-lift ${pathname === '/' ? 'text-[var(--accent-primary,#3b82f6)] font-semibold active-nav-indicator' : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'}`}
          >
            <Users className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> {t('artists')}
          </Link>

          <Link
            href="/portfolio"
            className={`text-sm font-medium transition-all flex items-center gap-1.5 hover-lift ${pathname === '/portfolio' ? 'text-[var(--accent-primary,#3b82f6)] font-semibold active-nav-indicator' : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'}`}
          >
            <LayoutTemplate className="w-4 h-4" /> {t('portfolio')}
          </Link>

          <Link
            href="/characters"
            className={`text-sm font-medium transition-all flex items-center gap-1.5 hover-lift ${pathname === '/characters' ? 'text-[var(--accent-primary,#3b82f6)] font-semibold active-nav-indicator' : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'}`}
          >
            <Users className="w-4 h-4" /> {t('characters')}
          </Link>

          <Link
            href="/auctions"
            className={`text-sm font-medium transition-all flex items-center gap-1.5 hover-lift ${pathname === '/auctions' ? 'text-[var(--accent-primary,#3b82f6)] font-semibold active-nav-indicator' : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'}`}
          >
            <Gavel className="w-4 h-4" /> {t('auctions')}
          </Link>
          
          {user && (
            <Link
              href={user.is_admin ? '/dashboard/admin' : (user.is_artist ? '/dashboard/artist' : '/dashboard/client')}
              className={`text-sm font-medium transition-all flex items-center gap-1.5 hover-lift ${pathname.startsWith('/dashboard') ? 'text-[var(--accent-primary,#3b82f6)] font-semibold active-nav-indicator' : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> {user.is_admin ? t('adminControl') : (user.is_artist ? `🎨 ${t('artistStudio')}` : t('myOrders'))}
            </Link>
          )}

          {(!user || (!user.is_admin && !user.is_artist)) && (
            <Link
              href="/artists/register"
              className="text-xs font-extrabold text-[var(--accent-primary,#3b82f6)] bg-[var(--accent-primary,#3b82f6)]/10 px-3 py-1.5 rounded-xl border border-[var(--accent-primary,#3b82f6)]/30 hover:opacity-80 transition-all flex items-center gap-1"
            >
              {t('registerArtist')}
            </Link>
          )}

          <div className="w-px h-4 bg-[var(--border-subtle,#27272a)]"></div>

          {/* Theme & Language Switchers */}
          <ThemeSwitcher />

          <button
            onClick={switchLanguage}
            className="text-xs font-semibold text-[var(--text-primary,#f4f4f5)] hover:opacity-80 transition-all flex items-center gap-1 uppercase bg-[var(--bg-primary,#09090b)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle,#27272a)] cursor-pointer btn-press"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--accent-primary,#3b82f6)]" /> {locale}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted,#a1a1aa)] font-medium flex items-center gap-1">
                {t('hi')} <span className="text-[var(--text-primary,#f4f4f5)] font-semibold">{user.full_name}</span>
                {user.is_admin ? (
                  <span className="ml-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-extrabold">{t('adminRole')}</span>
                ) : user.is_artist ? (
                  <span className="ml-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">{t('artistRole')}</span>
                ) : null}
              </span>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-[var(--text-muted,#a1a1aa)] hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer bg-[var(--bg-primary,#09090b)] hover:bg-rose-500/10 p-2 rounded-lg border border-[var(--border-subtle,#27272a)] hover:border-rose-500/20 btn-press"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 hover-lift btn-press"
            >
              <UserCircle className="w-4 h-4" /> {t('login')}
            </Link>
          )}
        </nav>

        {/* Mobile Menu & Language Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeSwitcher />

          <button
            onClick={switchLanguage}
            className="text-xs font-semibold text-[var(--text-primary,#f4f4f5)] flex items-center gap-1 uppercase bg-[var(--bg-primary,#09090b)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle,#27272a)]"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--accent-primary,#3b82f6)]" /> {locale}
          </button>

          {user && <NotificationBell />}

          <button
            ref={mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--text-primary,#f4f4f5)] bg-[var(--bg-primary,#09090b)] rounded-xl border border-[var(--border-subtle,#27272a)] cursor-pointer focus:outline-none"
            aria-label={t('toggleNavigation')} aria-expanded={mobileMenuOpen} aria-controls={mobileMenuOpen ? mobileMenuId : undefined}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav id={mobileMenuId} aria-label={t('toggleNavigation')} className="md:hidden bg-[var(--bg-surface,#121215)]/95 border-b border-[var(--border-subtle,#27272a)] px-4 py-4 space-y-3 backdrop-blur-xl transition-all animate-in slide-in-from-top-2">
          {user && (
            <div className="p-3 bg-[var(--bg-primary,#09090b)] rounded-xl border border-[var(--border-subtle,#27272a)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-muted,#a1a1aa)]">{t('hi')}</p>
                <p className="text-sm font-semibold text-[var(--text-primary,#f4f4f5)] flex items-center gap-1.5">
                  {user.full_name}
                  {(user.is_admin || user.is_artist) && <span className="text-[10px] bg-[var(--accent-primary,#3b82f6)]/10 text-[var(--accent-primary,#3b82f6)] px-1.5 py-0.5 rounded-md border border-[var(--accent-primary,#3b82f6)]/30">{t('artist')}</span>}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> {t('logout')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/portfolio"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center text-sm font-medium transition-all ${
                pathname === '/portfolio'
                  ? 'bg-[var(--accent-primary,#3b82f6)]/10 border-[var(--accent-primary,#3b82f6)]/50 text-[var(--accent-primary,#3b82f6)]'
                  : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)] text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
              }`}
            >
              <LayoutTemplate className="w-5 h-5" /> {t('portfolio')}
            </Link>

            <Link
              href="/characters"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center text-sm font-medium transition-all ${
                pathname === '/characters'
                  ? 'bg-[var(--accent-primary,#3b82f6)]/10 border-[var(--accent-primary,#3b82f6)]/50 text-[var(--accent-primary,#3b82f6)]'
                  : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)] text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
              }`}
            >
              <Users className="w-5 h-5" /> {t('characters')}
            </Link>

            <Link
              href="/auctions"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center text-sm font-medium transition-all ${
                pathname === '/auctions'
                  ? 'bg-[var(--accent-primary,#3b82f6)]/10 border-[var(--accent-primary,#3b82f6)]/50 text-[var(--accent-primary,#3b82f6)]'
                  : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)] text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
              }`}
            >
              <Gavel className="w-5 h-5" /> {t('auctions')}
            </Link>

            {user ? (
              <Link
                href={user.is_admin ? '/dashboard/admin' : (user.is_artist ? '/dashboard/artist' : '/dashboard/client')}
                onClick={() => setMobileMenuOpen(false)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center text-sm font-medium transition-all ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-[var(--accent-primary,#3b82f6)]/10 border-[var(--accent-primary,#3b82f6)]/50 text-[var(--accent-primary,#3b82f6)]'
                    : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)] text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" /> {user.is_admin ? t('adminControl') : (user.is_artist ? `🎨 ${t('artistStudio')}` : t('myOrders'))}
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl border border-[var(--accent-primary,#3b82f6)]/40 bg-[var(--accent-primary,#3b82f6)]/20 text-[var(--accent-primary,#3b82f6)] flex flex-col items-center gap-1 text-center text-sm font-medium"
              >
                <UserCircle className="w-5 h-5" /> {t('login')}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
