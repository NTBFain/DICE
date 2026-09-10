'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthContext';
import { useRouter, usePathname, Link } from '@/i18n/routing';
import {
  Briefcase,
  Layers3,
  Gavel,
  BarChart3,
  Users,
  Droplet,
  Palette,
  Loader2,
  ExternalLink,
  Type,
  UserCircle,
  Shield,
  Crown,
} from 'lucide-react';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const ADMIN_NAV_ITEMS = [
  { id: 'users', href: '/dashboard/admin/users', label: 'User Control', icon: Shield, badge: 'Security' },
  { id: 'analytics', href: '/dashboard/admin/analytics', label: 'Platform Stats', icon: BarChart3, badge: 'Revenue' },
  { id: 'orders', href: '/dashboard/admin/orders', label: 'All Queues', icon: Briefcase, badge: 'Orders' },
  { id: 'portfolio', href: '/dashboard/admin/portfolio', label: 'All Portfolios', icon: Layers3, badge: 'Gallery' },
  { id: 'auctions', href: '/dashboard/admin/auctions', label: 'All Auctions', icon: Gavel, badge: 'Bids' },
  { id: 'characters', href: '/dashboard/admin/characters', label: 'All OCs', icon: Users, badge: 'Profiles' },
  { id: 'theme', href: '/dashboard/admin/theme', label: 'Theme Studio', icon: Palette, badge: 'Styling' },
  { id: 'homepage', href: '/dashboard/admin/homepage', label: 'Homepage Copy', icon: Type, badge: 'Hero' },
  { id: 'watermark', href: '/dashboard/admin/watermark', label: 'Watermark Tool', icon: Droplet, badge: 'Tool' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict route guard: only system admins (is_admin=True) allowed here
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.is_admin) {
        if (user.is_artist) {
          router.push('/dashboard/artist');
        } else {
          router.push('/dashboard/client');
        }
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
          Loading Admin Command Center...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans pb-28 sm:pb-32">
      {/* 👑 SYSTEM ADMIN TOP HEADER */}
      <header className="bg-neutral-900/90 backdrop-blur-md border-b border-purple-900/30 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-16 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3 truncate">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600 border border-amber-500/40 flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-purple-900/30">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate">DICE System Command Center</h1>
              <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider bg-purple-950 text-amber-300 px-2 py-0.5 rounded-full border border-purple-800/60">
                👑 System Admin
              </span>
            </div>
            <p className="text-neutral-400 text-[10px] sm:text-xs truncate">
              Administrator: <strong className="text-purple-300">{user.full_name || user.email}</strong>
            </p>
          </div>
        </div>

        {/* Global Controls & Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />

          <Link
            href="/dashboard/artist"
            className="hidden sm:flex items-center gap-1.5 text-xs text-blue-400 hover:text-white bg-blue-950/40 border border-blue-800/40 px-3 py-1.5 rounded-xl transition-colors"
          >
            🎨 Switch to Artist Studio
          </Link>

          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Public Site
          </Link>
        </div>
      </header>

      {/* 🖼️ MAIN ADMIN WORKSPACE */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* 📍 VIEWPORT-FIXED FLOATING CAPSULE BAR FOR ADMIN */}
      {mounted && createPortal(
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-1.5rem)] sm:w-auto max-w-fit pointer-events-auto">
          {/* Mobile Bar View (< sm) */}
          <nav className="sm:hidden bg-neutral-900/95 backdrop-blur-xl border border-purple-900/40 rounded-2xl px-2 py-2 flex items-center justify-around w-full shadow-2xl">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'users' && pathname === '/dashboard/admin');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex-1 ${
                    isActive
                      ? 'text-white bg-purple-600/30 border border-purple-500/50'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-amber-300' : 'text-neutral-400'}`} />
                  <span className="text-[9px] tracking-tight truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop / Tablet Capsule View (>= sm) */}
          <nav className="hidden sm:flex bg-neutral-900/95 backdrop-blur-xl border border-purple-900/40 shadow-2xl rounded-full px-3.5 py-2 items-center gap-1.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'users' && pathname === '/dashboard/admin');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white border border-amber-500/50 shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="text-[9px] font-mono bg-purple-950 text-amber-300 border border-purple-700/60 px-2 py-0.5 rounded-full hidden md:inline">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>,
        document.body
      )}
    </div>
  );
}
