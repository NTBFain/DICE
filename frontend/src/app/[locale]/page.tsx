'use client';

import { useState, useEffect } from 'react';
import { getMarketplaceArtists, ArtistProfile } from '@/lib/marketplaceApi';
import ArtistCard from '@/components/ArtistCard';
import { Users, Search, Sparkles, Loader2, Compass } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';

import { useTranslations } from 'next-intl';

const STYLE_CATEGORIES = [
  { id: 'ALL', key: 'ALL' },
  { id: 'VTuber 2D', key: 'VTuber 2D' },
  { id: 'Character Sheet', key: 'Character Sheet' },
  { id: 'Chibi', key: 'Chibi' },
  { id: 'Environment', key: 'Environment' },
];

export default function Home() {
  const { user } = useAuth();
  const tHome = useTranslations('Home');
  const tCat = useTranslations('Categories');

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
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] px-3 py-4 sm:px-6 sm:py-8 lg:px-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-10 pb-24 md:pb-12 w-full overflow-x-hidden">
      
      {/* 🚀 MAIN HOMEPAGE HERO: MULTI-ARTIST SELECTION HUB */}
      <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xl relative overflow-hidden animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Hero Text & Controls */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-6">
            <div className="space-y-2.5 sm:space-y-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono font-bold text-[var(--accent-primary,#3b82f6)] uppercase tracking-wider bg-[var(--accent-primary,#3b82f6)]/10 px-2.5 py-1 rounded-full border border-[var(--accent-primary,#3b82f6)]/30 max-w-full truncate">
                <Compass className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary,#3b82f6)]" />
                <span className="truncate">{tHome('badge')}</span>
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-4xl xl:text-5xl font-black tracking-tight text-[var(--text-primary,#f4f4f5)] leading-tight">
                {tHome('title1')}<span className="text-[var(--accent-primary,#3b82f6)]">{tHome('titleHighlight')}</span>{tHome('title2')}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted,#a1a1aa)] leading-relaxed max-w-2xl">
                {tHome('description')}
              </p>

              {(!user || !user.is_admin) && (
                <div className="pt-1 sm:pt-2">
                  <Link
                    href="/artists/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs transition-all shadow-md text-center"
                  >
                    {tHome('artistRegisterCta')}
                  </Link>
                </div>
              )}
            </div>

            {/* 🔍 SEARCH & FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
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
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
              {STYLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedStyle(cat.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                    selectedStyle === cat.id
                      ? 'bg-[var(--accent-primary,#3b82f6)] text-white border-[var(--accent-primary,#3b82f6)] shadow-md'
                      : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
                  }`}
                >
                  {tCat(cat.key as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column (Visible on Ultrawide & Desktop): Platform Live Stats & Trust Badge Widget */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-3">
            <div className="bg-[var(--bg-primary,#09090b)]/80 border border-[var(--border-subtle,#27272a)] rounded-2xl p-5 space-y-4 backdrop-blur-md relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle,#27272a)] pb-3">
                <span className="text-xs font-extrabold text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {tHome('liveStatsTitle')}
                </span>
                <span className="text-[10px] font-mono text-[var(--accent-primary,#3b82f6)] bg-[var(--accent-primary,#3b82f6)]/10 px-2 py-0.5 rounded border border-[var(--accent-primary,#3b82f6)]/30">{tHome('directArtists')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-surface,#121215)] p-3.5 rounded-xl border border-[var(--border-subtle,#27272a)]">
                  <span className="text-[10px] font-mono text-[var(--text-muted,#a1a1aa)] block">{tHome('activeArtists')}</span>
                  <span className="text-xl font-black text-[var(--text-primary,#f4f4f5)] font-mono">{artists.length}</span>
                </div>
                <div className="bg-[var(--bg-surface,#121215)] p-3.5 rounded-xl border border-[var(--border-subtle,#27272a)]">
                  <span className="text-[10px] font-mono text-[var(--text-muted,#a1a1aa)] block">{tHome('commissionFee')}</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{tHome('directFee')}</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-3.5 rounded-xl border border-blue-500/20 flex items-center justify-between">
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
