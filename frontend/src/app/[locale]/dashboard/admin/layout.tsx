'use client';

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
  BarChart3,
  Users,
  Droplet,
  Palette,
  Loader2,
  ExternalLink,
  Type,
  UserCircle,
} from 'lucide-react';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const ADMIN_NAV_ITEMS = [
  { id: 'orders', href: '/dashboard/admin/orders', label: 'Queue', icon: Briefcase, badge: 'Active' },
  { id: 'portfolio', href: '/dashboard/admin/portfolio', label: 'Gallery', icon: Layers3, badge: 'Artwork' },
  { id: 'profile', href: '/dashboard/admin/profile', label: 'Profile', icon: UserCircle, badge: 'Setup' },
  { id: 'auctions', href: '/dashboard/admin/auctions', label: 'Auctions', icon: Gavel, badge: 'Bids' },
  { id: 'characters', href: '/dashboard/admin/characters', label: 'OCs', icon: Users, badge: 'Profiles' },
  { id: 'theme', href: '/dashboard/admin/theme', label: 'Theme Studio', icon: Palette, badge: 'Custom' },
  { id: 'homepage', href: '/dashboard/admin/homepage', label: 'Copy', icon: Type, badge: 'Hero' },
  { id: 'analytics', href: '/dashboard/admin/analytics', label: 'Stats', icon: BarChart3, badge: 'Report' },
  { id: 'watermark', href: '/dashboard/admin/watermark', label: 'Tool', icon: Droplet, badge: 'Watermark' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect non-artist/non-admin users
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.is_admin && !user.is_artist) {
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

  if (authLoading || !user || (!user.is_admin && !user.is_artist)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
          Loading Atelier Studio...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans pb-28 sm:pb-32">
      {/* 👑 MINIMAL TOP STUDIO HEADER */}
      <header className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3 truncate">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 border border-blue-500/40 flex items-center justify-center text-white font-black shrink-0">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate">Atelier Studio</h1>
              <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider bg-neutral-950 text-blue-400 px-2 py-0.5 rounded-full border border-neutral-800">
                2D Artist
              </span>
            </div>
            <p className="text-neutral-400 text-[10px] sm:text-xs truncate">
              <strong className="text-white">{user.full_name || user.email}</strong>
            </p>
          </div>
        </div>

        {/* Global Commission Accepting Toggle & Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />

          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-neutral-950 border border-neutral-800 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl">
            <span className={`text-[10px] sm:text-xs font-extrabold truncate ${isCommissionOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isCommissionOpen ? '● OPEN' : '● CLOSED'}
            </span>
            <button
              onClick={() => toggleStatusMutation.mutate(!isCommissionOpen)}
              disabled={toggleStatusMutation.isPending || !artistProfile}
              className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-lg transition-colors cursor-pointer border ${
                isCommissionOpen
                  ? 'bg-neutral-900 text-rose-400 border-neutral-800 hover:bg-rose-500/20'
                  : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
              }`}
            >
              {toggleStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : isCommissionOpen ? 'Close' : 'Open'}
            </button>
          </div>

          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Public Gallery
          </Link>
        </div>
      </header>

      {/* 🖼️ FULL-BLEED WORKSPACE CANVAS */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* 📍 VIEWPORT-FIXED FLOATING CAPSULE BAR (สบายตา Contrast สูง ไม่แยงตา) */}
      {mounted && createPortal(
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-1.5rem)] sm:w-auto max-w-fit pointer-events-auto">
          {/* Mobile Bar View (< sm) */}
          <nav className="sm:hidden bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl px-2 py-2 flex items-center justify-around w-full shadow-2xl">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'orders' && pathname === '/dashboard/admin');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex-1 ${
                    isActive
                      ? 'text-white bg-blue-600/20 border border-blue-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-blue-400' : 'text-neutral-400'}`} />
                  <span className="text-[9px] tracking-tight truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop / Tablet Capsule View (>= sm) */}
          <nav className="hidden sm:flex bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 shadow-2xl rounded-full px-3.5 py-2 items-center gap-1.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.id === 'orders' && pathname === '/dashboard/admin');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white border border-blue-500/50 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="text-[9px] font-mono bg-blue-900/80 text-blue-200 border border-blue-700/60 px-2 py-0.5 rounded-full hidden md:inline">
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
