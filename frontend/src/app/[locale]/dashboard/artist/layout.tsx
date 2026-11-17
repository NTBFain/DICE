'use client';

import { useTranslations } from 'next-intl';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthContext';
import { useRouter, usePathname, Link } from '@/i18n/routing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyArtistProfile, updateArtistProfile } from '@/lib/api';
import {
  Briefcase,
  Layers3,
  Gavel,
  Users,
  Droplet,
  Palette,
  Loader2,
  ExternalLink,
  UserCircle,
  BarChart3,
} from 'lucide-react';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const ARTIST_NAV_ITEMS = [
  { id: 'orders', href: '/dashboard/artist/orders', label: 'Queue', icon: Briefcase, badge: 'Active' },
  { id: 'commissions', href: '/dashboard/artist/commissions', label: 'Commissions', icon: Palette, badge: 'VGen' },
  { id: 'analytics', href: '/dashboard/artist/analytics', label: 'Earnings & Stats', icon: BarChart3, badge: 'Income' },
  { id: 'portfolio', href: '/dashboard/artist/portfolio', label: 'Gallery', icon: Layers3, badge: 'Artwork' },
  { id: 'profile', href: '/dashboard/artist/profile', label: 'Profile', icon: UserCircle, badge: 'Rates' },
  { id: 'auctions', href: '/dashboard/artist/auctions', label: 'Auctions', icon: Gavel, badge: 'Adoptable' },
  { id: 'characters', href: '/dashboard/artist/characters', label: 'OCs', icon: Users, badge: 'Sheets' },
  { id: 'watermark', href: '/dashboard/artist/watermark', label: 'Watermark', icon: Droplet, badge: 'Tool' },
];

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('StudioNavigation');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect non-artist users
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.is_artist && !user.is_admin) {
        router.push('/dashboard/client');
      }
    }
  }, [user, authLoading, router]);

  // Artist profile query & mutation for commission status
  const { data: artistProfile } = useQuery({
    queryKey: ['my-artist-profile'],
    queryFn: getMyArtistProfile,
    retry: false,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (newOpen: boolean) => updateArtistProfile({ commission_status: newOpen ? 'OPEN' : 'CLOSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
    },
  });

  const isCommissionOpen = artistProfile?.commission_status === 'OPEN';

  if (authLoading || !user || (!user.is_artist && !user.is_admin)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
          {t('loadingArtist')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans pb-24">
      {/* 🎨 ARTIST STUDIO TOP HEADER */}
      <header className="studio-header bg-neutral-900/90 backdrop-blur-md border-b border-blue-900/30 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-14 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3 truncate">
          <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-500/40 flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-blue-950/40">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate">{t('artistTitle')}</h1>
              <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/60">
                {t('artistPanel')}
              </span>
            </div>
            <p className="text-neutral-400 text-[10px] sm:text-xs truncate">
              {t('artistLabel')} <strong className="text-white">{artistProfile?.display_name || user.full_name || user.email}</strong>
            </p>
          </div>
        </div>

        {/* Global Commission Accepting Toggle & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />

          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-neutral-950 border border-neutral-800 px-2.5 sm:px-3 py-1 rounded-xl">
            <span className={`text-[10px] sm:text-xs font-extrabold truncate ${isCommissionOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isCommissionOpen ? t('openStatus') : t('closedStatus')}
            </span>
            <button
              onClick={() => toggleStatusMutation.mutate(!isCommissionOpen)}
              disabled={toggleStatusMutation.isPending}
              className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer border ${
                isCommissionOpen
                  ? 'bg-neutral-900 text-rose-400 border-neutral-800 hover:bg-rose-500/20'
                  : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
              }`}
            >
              {toggleStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : isCommissionOpen ? t('close') : t('open')}
            </button>
          </div>

          {user.is_admin && (
            <Link
              href="/dashboard/admin/users"
              className="hidden sm:flex items-center gap-1 text-xs text-amber-300 bg-purple-950/60 border border-purple-800/60 px-3 py-1.5 rounded-xl transition-colors"
            >
              👑 Admin Command Center
            </Link>
          )}

          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {t('publicGallery')}
          </Link>
        </div>
      </header>

      {/* 🖼️ ARTIST WORKSPACE CANVAS */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* 📍 FLOATING CAPSULE BAR FOR ARTIST */}
      {mounted && createPortal(
        <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] sm:w-auto max-w-fit pointer-events-auto">
          {/* Mobile Bar View (< sm) */}
          <nav className="studio-nav sm:hidden bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl px-2 py-1.5 flex items-center justify-start gap-1 w-full max-w-full overflow-x-auto overscroll-x-contain shadow-2xl">
            {ARTIST_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'orders' && pathname === '/dashboard/artist');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex-none min-w-[3.5rem] ${
                    isActive
                      ? 'text-white bg-blue-600/20 border border-blue-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mb-0.5 ${isActive ? 'text-blue-400' : 'text-neutral-400'}`} />
                  <span className="text-[9px] tracking-tight truncate">{t('artist.' + item.id)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop / Tablet Capsule View (>= sm) */}
          <nav className="studio-nav hidden sm:flex bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 shadow-2xl rounded-full px-3 py-1.5 items-center gap-1">
            {ARTIST_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'orders' && pathname === '/dashboard/artist');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white border border-blue-500/50 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                  <span>{t('artist.' + item.id)}</span>
                  {isActive && (
                    <span className="text-[9px] font-mono bg-blue-900/80 text-blue-200 border border-blue-700/60 px-1.5 py-0.5 rounded-full hidden md:inline">
                      {t('artistBadge.' + item.id)}
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
