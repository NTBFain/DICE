'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPortfolio, getArtists, Artwork } from '@/lib/api';
import { Loader2, Eye, X, Image as ImageIcon, Sparkles, User, Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';

const WORK_TYPES = [
  { id: 'COMMISSION', label: 'Commission Work' },
  { id: 'FANART', label: 'Fanart & Original' },
  { id: 'VTUBER_MODEL', label: 'VTuber 2D Asset' },
];

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <PortfolioContent />
    </Suspense>
  );
}

function PortfolioContent() {
  const [activeArtwork, setActiveArtwork] = useState<Artwork | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<number | 'all'>('all');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('all');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const t = useTranslations('Portfolio');
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterParam = searchParams?.get('character');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveArtwork(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const PAGE_SIZE = 32;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [selectedArtist, selectedWorkType, characterParam]);

  const { data: artworks, isLoading: isLoadingArtworks, isError: isErrorArtworks } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => getPortfolio({ limit: 500 }),
  });

  const { data: artists, isLoading: isLoadingArtists } = useQuery({
    queryKey: ['artists'],
    queryFn: () => getArtists(),
  });

  const filteredArtworks = artworks?.filter(artwork => {
    const matchArtist = selectedArtist === 'all' || artwork.artist?.id === selectedArtist;
    const matchWorkType = selectedWorkType === 'all' || artwork.work_type === selectedWorkType;
    const matchCharacter = !characterParam || artwork.character_id === Number(characterParam) || artwork.character?.id === Number(characterParam);
    return matchArtist && matchWorkType && matchCharacter;
  }) || [];

  const displayedArtworks = filteredArtworks.slice(0, displayLimit);

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] pb-20">
      {/* 🖼️ HERO & FILTER STICKY HEADER */}
      <div className="sticky top-14 z-30 bg-[var(--bg-surface,#121215)]/85 backdrop-blur-2xl border-b border-[var(--border-subtle,#27272a)] shadow-sm transition-all">
        <div className="container mx-auto px-4 sm:px-8 py-4 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-0.5"
            >
              <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-primary,#3b82f6)] to-[var(--accent-secondary,#e2b857)] tracking-tight">
                {t('title')}
              </h1>
              <p className="text-xs font-medium text-[var(--text-muted,#a1a1aa)]">
                {t('subtitle')}
              </p>
            </motion.div>

            {/* Work Type Category Pills */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0"
            >
              <button
                onClick={() => setSelectedWorkType('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${
                  selectedWorkType === 'all'
                    ? 'bg-[var(--accent-primary,#3b82f6)] text-[var(--accent-contrast,#ffffff)] border-[var(--accent-primary,#3b82f6)] ring-2 ring-[var(--accent-primary,#3b82f6)]/20 shadow-md'
                    : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:bg-[var(--bg-surface-hover,#1c1c21)] hover:text-[var(--text-primary,#f4f4f5)] hover:border-[var(--border-hover,#3f3f46)]'
                }`}
              >
                All Categories
              </button>
              {WORK_TYPES.map((wt) => (
                <button
                  key={wt.id}
                  onClick={() => setSelectedWorkType(wt.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${
                    selectedWorkType === wt.id
                      ? 'bg-[var(--accent-primary,#3b82f6)] text-[var(--accent-contrast,#ffffff)] border-[var(--accent-primary,#3b82f6)] ring-2 ring-[var(--accent-primary,#3b82f6)]/20 shadow-md'
                      : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:bg-[var(--bg-surface-hover,#1c1c21)] hover:text-[var(--text-primary,#f4f4f5)] hover:border-[var(--border-hover,#3f3f46)]'
                  }`}
                >
                  {wt.label}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Artist Filter Strip */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory mt-6 pt-6 border-t border-[var(--border-subtle,#27272a)] pb-2 md:pb-0"
          >
            <div className="text-[10px] font-black text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest shrink-0 flex items-center gap-1.5 mr-2 snap-center">
              <User className="w-3.5 h-3.5" /> Artists
            </div>

            <button
              onClick={() => setSelectedArtist('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 snap-center border ${
                selectedArtist === 'all'
                  ? 'bg-[var(--accent-primary,#3b82f6)] text-[var(--accent-contrast,#ffffff)] border-[var(--accent-primary,#3b82f6)] shadow-md'
                  : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:bg-[var(--bg-surface-hover,#1c1c21)] hover:text-[var(--text-primary,#f4f4f5)] hover:border-[var(--border-hover,#3f3f46)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> All Artists
            </button>

            {!isLoadingArtists && artists?.map((artist) => {
              const isSelected = selectedArtist === artist.id;
              return (
                <button
                  key={artist.id}
                  onClick={() => setSelectedArtist(artist.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 snap-center border ${
                    isSelected
                      ? 'bg-[var(--accent-primary,#3b82f6)] text-[var(--accent-contrast,#ffffff)] border-[var(--accent-primary,#3b82f6)] shadow-md'
                      : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:bg-[var(--bg-surface-hover,#1c1c21)] hover:text-[var(--text-primary,#f4f4f5)] hover:border-[var(--border-hover,#3f3f46)]'
                  }`}
                >
                  {artist.avatar_url ? (
                    <img
                      src={artist.avatar_url}
                      alt={artist.display_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-[var(--accent-contrast,#ffffff)] font-black bg-[var(--accent-primary,#3b82f6)]"
                    >
                      {artist.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{artist.display_name}</span>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-8 py-8 max-w-7xl">
        {/* Loading & Error States */}
        {isLoadingArtworks && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-neutral-500 text-sm font-bold animate-pulse">Curating Exhibition...</p>
          </div>
        )}

        {isErrorArtworks && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-3xl text-center max-w-lg mx-auto font-bold flex flex-col items-center">
            <X className="w-12 h-12 mb-2 opacity-50" />
            {t('error')}
          </div>
        )}

        {!isLoadingArtworks && !isErrorArtworks && filteredArtworks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 bg-[var(--bg-surface,#121215)]/60 backdrop-blur-xl border border-[var(--border-subtle,#27272a)] rounded-3xl shadow-sm"
          >
            <Search className="w-16 h-16 text-[var(--text-muted,#a1a1aa)] mx-auto mb-4" />
            <h3 className="text-xl font-black text-[var(--text-primary,#f4f4f5)]">No Artworks Found</h3>
            <p className="text-sm text-[var(--text-muted,#a1a1aa)] mt-2">Try selecting a different artist or category.</p>
          </motion.div>
        )}

        {/* 🖼️ DYNAMIC MASONRY GALLERY */}
        {!isLoadingArtworks && filteredArtworks.length > 0 && (
          <motion.div 
            layout
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
          >
            <AnimatePresence>
              {displayedArtworks.map((artwork) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  key={artwork.id}
                  onClick={() => setActiveArtwork(artwork)}
                  onHoverStart={() => setHoveredCard(artwork.id!)}
                  onHoverEnd={() => setHoveredCard(null)}
                  className="break-inside-avoid relative group rounded-3xl overflow-hidden bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] hover:border-[var(--accent-primary,#3b82f6)] cursor-pointer shadow-lg hover:shadow-2xl transition-all"
                >
                  <motion.div
                    animate={{ scale: hoveredCard === artwork.id ? 1.05 : 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full h-full"
                  >
                    <img
                      src={getImageUrl(artwork.image_url)}
                      alt={artwork.title}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </motion.div>
                  
                  {/* Glassmorphic Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 flex flex-col justify-end p-5 ${hoveredCard === artwork.id ? 'opacity-100' : 'opacity-0'}`}>
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: hoveredCard === artwork.id ? 0 : 10, opacity: hoveredCard === artwork.id ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-lg font-black text-white mb-2">{artwork.title}</h3>
                      
                      {/* Artist Badge */}
                      {artwork.artist && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/artists/${artwork.artist!.handle}`);
                          }}
                          className="flex items-center gap-2 mb-3 bg-white/10 hover:bg-white/20 backdrop-blur-md p-1.5 pr-3 rounded-full transition-colors w-fit border border-white/20 shadow-sm"
                        >
                          {artwork.artist.avatar_url ? (
                            <img src={artwork.artist.avatar_url} alt={artwork.artist.display_name} className="w-6 h-6 rounded-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent-primary,#3b82f6)] flex items-center justify-center text-[10px] font-bold text-[var(--accent-contrast,#ffffff)]">
                              {artwork.artist.display_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">
                            {artwork.artist.display_name}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-neutral-300 line-clamp-2 mb-4">
                        {artwork.description}
                      </p>

                      <div className="flex items-center justify-between border-t border-white/10 pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> Inspect
                        </div>
                        <span className="text-[10px] font-mono text-white/50 uppercase">{artwork.work_type}</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Load More Button */}
        {!isLoadingArtworks && displayLimit < filteredArtworks.length && (
          <div className="flex flex-col items-center justify-center mt-12 gap-2">
            <button
              onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}
              className="px-8 py-3.5 bg-[var(--accent-primary,#3b82f6)] hover:bg-[var(--accent-hover,#2563eb)] active:scale-95 text-[var(--accent-contrast,#ffffff)] font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm"
            >
              Load More Artworks ({filteredArtworks.length - displayLimit} remaining)
            </button>
            <span className="text-xs text-[var(--text-muted,#a1a1aa)]">
              Showing {displayedArtworks.length} of {filteredArtworks.length} items
            </span>
          </div>
        )}
      </div>

      {/* 🔍 CINEMATIC FULLSCREEN LIGHTBOX */}
      <AnimatePresence>
        {activeArtwork && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={activeArtwork.title}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => setActiveArtwork(null)}
              aria-label="Close artwork inspector"
              className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xl"
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div 
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-[2rem] max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Image Section */}
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-6 relative group">
                <img
                  src={getImageUrl(activeArtwork.image_url)}
                  alt={activeArtwork.title}
                  className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>

              {/* Details Section */}
              <div className="w-full md:w-96 bg-[var(--bg-surface,#121215)] p-8 flex flex-col justify-between space-y-6 border-t md:border-t-0 md:border-l border-[var(--border-subtle,#27272a)] overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-[var(--accent-primary,#3b82f6)] uppercase tracking-widest bg-[var(--accent-primary,#3b82f6)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary,#3b82f6)]/20 inline-block mb-3">
                      {activeArtwork.work_type}
                    </span>
                    <h2 className="text-3xl font-black text-[var(--text-primary,#f4f4f5)] leading-tight">{activeArtwork.title}</h2>
                  </div>
                  
                  <div className="h-px w-full bg-gradient-to-r from-[var(--border-subtle,#27272a)] to-transparent"></div>

                  <p className="text-sm text-[var(--text-muted,#a1a1aa)] leading-relaxed whitespace-pre-line">
                    {activeArtwork.description || 'No additional artwork description provided.'}
                  </p>

                  {activeArtwork.character && (
                    <div className="bg-[var(--bg-primary,#09090b)] p-4 rounded-2xl border border-[var(--border-subtle,#27272a)] space-y-2">
                      <span className="text-[10px] font-black text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest block">Featured Character</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary,#3b82f6)]/20 flex items-center justify-center border border-[var(--accent-primary,#3b82f6)]/50">
                          <Sparkles className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary,#f4f4f5)]">
                          {activeArtwork.character.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeArtwork.artist && (
                    <div className="bg-[var(--bg-primary,#09090b)] p-4 rounded-2xl border border-[var(--border-subtle,#27272a)] space-y-2">
                      <span className="text-[10px] font-black text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest block">Created By</span>
                      <button 
                        onClick={() => router.push(`/artists/${activeArtwork.artist!.handle}`)}
                        className="flex items-center gap-3 hover:bg-[var(--bg-surface-hover,#1c1c21)] p-2 -ml-2 rounded-xl transition-all cursor-pointer w-full text-left group"
                      >
                        {activeArtwork.artist.avatar_url ? (
                          <img src={activeArtwork.artist.avatar_url} alt={activeArtwork.artist.display_name} className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-[var(--accent-primary,#3b82f6)] transition-colors" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary,#3b82f6)] flex items-center justify-center text-sm font-black text-[var(--accent-contrast,#ffffff)] border-2 border-transparent group-hover:border-[var(--accent-primary,#3b82f6)] transition-colors">
                            {activeArtwork.artist.display_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="block text-sm font-bold text-[var(--text-primary,#f4f4f5)] group-hover:text-[var(--accent-primary,#3b82f6)] transition-colors">{activeArtwork.artist.display_name}</span>
                          <span className="block text-[11px] font-mono text-[var(--text-muted,#a1a1aa)]">@{activeArtwork.artist.handle}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--border-subtle,#27272a)]">
                  <button
                    onClick={() => setActiveArtwork(null)}
                    className="w-full py-3.5 bg-[var(--accent-primary,#3b82f6)] hover:bg-[var(--accent-hover,#2563eb)] text-[var(--accent-contrast,#ffffff)] font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
