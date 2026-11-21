'use client';

import { useState, useEffect } from 'react';
import { getMarketplaceArtists, ArtistProfile } from '@/lib/marketplaceApi';
import ArtistCard from '@/components/ArtistCard';
import { Users, Search, Sparkles, Loader2, Compass } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';

import { useQuery } from '@tanstack/react-query';
import { getHomepageText } from '@/lib/api';
import { useTranslations } from 'next-intl';

const STYLE_CATEGORIES = [
  { id: 'ALL', key: 'ALL' },
  { id: 'VTuber 2D', key: 'VTuber 2D' },
  { id: 'Character Sheet', key: 'Character Sheet' },
  { id: 'Chibi', key: 'Chibi' },
  { id: 'Environment', key: 'Environment' },
];

const ROLE_MANUALS: { label: 'artistManual' | 'clientManual'; href: string | null }[] = [
  { label: 'artistManual', href: null },
  { label: 'clientManual', href: null },
];

export default function Home() {
  const { user } = useAuth();
  const tHome = useTranslations('Home');
  const tCat = useTranslations('Categories');
  const { data: homepageCopy } = useQuery({ queryKey: ['homepage-text'], queryFn: getHomepageText });
  const publishedCopy = homepageCopy?.is_customized ? homepageCopy : null;

  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [onlyOpenCommissions, setOnlyOpenCommissions] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMarketplaceArtists({
          query: debouncedQuery,
          style: selectedStyle,
          status: onlyOpenCommissions ? 'OPEN' : undefined,
        });
        if (!isCancelled) {
          setArtists(data);
        }
      } catch (err) {
        console.error('Failed to fetch marketplace artists:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, selectedStyle, onlyOpenCommissions]);

  return (
    <div data-page-surface className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-20 md:pb-10 w-full overflow-x-hidden">
      
      {/* 🚀 MAIN HOMEPAGE HERO: MULTI-ARTIST SELECTION HUB */}
      <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl p-4 sm:p-6 shadow-lg relative overflow-hidden animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
          
          {/* Left Column: Hero Text & Controls */}
          <div className="min-w-0 lg:col-span-7 xl:col-span-8 space-y-3.5">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--accent-primary,#3b82f6)] uppercase tracking-wider bg-[var(--accent-primary,#3b82f6)]/10 px-2.5 py-0.5 rounded-full border border-[var(--accent-primary,#3b82f6)]/30 max-w-full truncate">
                <Compass className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary,#3b82f6)]" />
                <span className="truncate">{publishedCopy?.hero_tag ?? tHome('badge')}</span>
              </span>
              <h1 className="text-xl sm:text-3xl lg:text-3xl font-black tracking-tight text-[var(--text-primary,#f4f4f5)] leading-snug">
                {publishedCopy ? <>{publishedCopy.hero_title_1} <span className="text-[var(--accent-primary,#3b82f6)]">{publishedCopy.hero_title_2}</span></> : <>{tHome('title1')}<span className="text-[var(--accent-primary,#3b82f6)]">{tHome('titleHighlight')}</span>{tHome('title2')}</>}
              </h1>
              <p className="text-xs text-[var(--text-muted,#a1a1aa)] leading-relaxed max-w-2xl">
                {publishedCopy?.hero_subtitle ?? tHome('description')}
              </p>

              {publishedCopy && <div className="flex flex-wrap gap-2 text-xs text-neutral-300">{[publishedCopy.badge_1, publishedCopy.badge_2, publishedCopy.badge_3].filter(Boolean).map((badge, index) => <span key={index} className="rounded-full border border-neutral-700 px-2 py-1">{badge}</span>)}</div>}
              {(!user || !user.is_admin) && (
                <div className="pt-0.5">
                  <Link
                    href="/artists/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl studio-primary font-extrabold text-xs transition-all shadow-md text-center"
                  >
                    {tHome('artistRegisterCta')}
                  </Link>
                </div>
              )}
            </div>

            {/* 🔍 SEARCH & FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--text-muted,#a1a1aa)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={tHome('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] shadow-inner"
                />
              </div>

              <button
                type="button"
                onClick={() => setOnlyOpenCommissions(!onlyOpenCommissions)}
                className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border shrink-0 ${
                  onlyOpenCommissions
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{tHome('openOnly')}</span>
              </button>
            </div>

            {/* STYLE CATEGORY PILLS */}
            <div
              role="region"
              aria-label={tHome('styleFilters')}
              tabIndex={0}
              className="flex w-full gap-2 overflow-x-auto overscroll-x-contain rounded-lg px-1 pb-2 pt-1 [scrollbar-color:var(--text-muted)_var(--bg-primary)] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
            >
              {STYLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  aria-pressed={selectedStyle === cat.id}
                  onClick={() => setSelectedStyle(cat.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                    selectedStyle === cat.id
                      ? 'studio-primary shadow-sm'
                      : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
                  }`}
                >
                  {tCat(cat.key as any)}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-[var(--bg-primary,#09090b)]/80 border border-[var(--border-subtle,#27272a)] rounded-2xl p-5 space-y-4 backdrop-blur-md relative overflow-hidden shadow-inner">
              <div className="hidden lg:flex items-center border-b border-[var(--border-subtle,#27272a)] pb-3">
                <span className="text-xs font-extrabold text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {tHome('liveStatsTitle')}
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                <div className="hidden lg:block bg-[var(--bg-surface,#121215)] p-3.5 rounded-xl border border-[var(--border-subtle,#27272a)]">
                  <span className="text-[10px] font-mono text-[var(--text-muted,#a1a1aa)] block">{tHome('activeArtists')}</span>
                  <span className="text-xl font-black text-[var(--text-primary,#f4f4f5)] font-mono">{artists.length}</span>
                </div>
                <div className="grid content-center gap-2">
                  {ROLE_MANUALS.map(({ label, href }) => {
                    const style = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-center text-sm font-semibold';
                    return href ? (
                      <a key={label} href={href} download className={style}>{tHome(label)}</a>
                    ) : (
                      <button key={label} type="button" disabled aria-describedby="manual-download-status"
                        className={`${style} cursor-not-allowed text-[var(--text-muted)]`}>
                        {tHome(label)}
                      </button>
                    );
                  })}
                  {ROLE_MANUALS.some(({ href }) => !href) && (
                    <p id="manual-download-status" className="text-center text-xs text-[var(--text-muted)]">{tHome('manualsComingSoon')}</p>
                  )}
                </div>
              </div>

              <div className="bg-[var(--accent-soft)] p-3.5 rounded-xl border border-[var(--border-subtle)] hidden lg:flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">{tHome('safeSystemTitle')}</span>
                  <span className="text-[10px] text-[var(--text-muted,#a1a1aa)] block">{tHome('safeSystemDesc')}</span>
                </div>
                <Sparkles className="w-6 h-6 text-[var(--accent-primary,#3b82f6)] opacity-80 shrink-0" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 🎨 ARTIST DIRECTORY GRID */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pb-3 sm:pb-4 border-b border-[var(--border-subtle,#27272a)]">
          <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent-primary,#3b82f6)] shrink-0" /> {tHome('directoryTitle')} ({artists.length})
          </h2>
          <span className="text-[10px] sm:text-xs font-mono text-[var(--text-muted,#a1a1aa)]">{tHome('directorySubtitle')}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl sm:rounded-3xl">
            <Loader2 className="w-8 h-8 text-[var(--accent-primary,#3b82f6)] animate-spin mb-2" />
            <span className="text-xs text-[var(--text-muted,#a1a1aa)] font-bold uppercase tracking-widest">{tHome('loading')}</span>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-16 sm:py-24 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl sm:rounded-3xl px-4">
            <Users className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary,#f4f4f5)]">{tHome('emptyTitle')}</h3>
            <p className="text-xs text-[var(--text-muted,#a1a1aa)] mt-1">{tHome('emptyDesc')}</p>
            {(searchQuery || selectedStyle !== 'ALL' || onlyOpenCommissions) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStyle('ALL');
                  setOnlyOpenCommissions(false);
                }}
                className="mt-4 px-4 py-2 text-xs font-bold bg-[var(--bg-surface-hover,#1c1c21)] hover:bg-[var(--border-hover,#3f3f46)] text-[var(--text-primary,#f4f4f5)] rounded-xl border border-[var(--border-subtle,#27272a)] transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
