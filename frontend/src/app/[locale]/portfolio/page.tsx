'use client';

import { useState } from 'react';
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

export default function PortfolioPage() {
  const [activeArtwork, setActiveArtwork] = useState<Artwork | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<number | 'all'>('all');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('all');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const t = useTranslations('Portfolio');
  const router = useRouter();

  const { data: artworks, isLoading: isLoadingArtworks, isError: isErrorArtworks } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
  });

  const { data: artists, isLoading: isLoadingArtists } = useQuery({
    queryKey: ['artists'],
    queryFn: getArtists,
  });

  const filteredArtworks = artworks?.filter(artwork => {
    const matchArtist = selectedArtist === 'all' || artwork.artist?.id === selectedArtist;
    const matchWorkType = selectedWorkType === 'all' || artwork.work_type === selectedWorkType;
    return matchArtist && matchWorkType;
  }) || [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20">
      {/* 🖼️ HERO & FILTER STICKY HEADER */}
      <div className="sticky top-[72px] z-30 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm transition-all">
        <div className="container mx-auto px-4 sm:px-8 py-6 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 tracking-tight">
                {t('title')}
              </h1>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
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
                    ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
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
                      ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
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
            className="flex items-center gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory mt-6 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50 pb-2 md:pb-0"
          >
            <div className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest shrink-0 flex items-center gap-1.5 mr-2 snap-center">
              <User className="w-3.5 h-3.5" /> Artists
            </div>

            <button
              onClick={() => setSelectedArtist('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 snap-center ${
                selectedArtist === 'all'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
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
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent shadow-md'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
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
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-black bg-blue-500"
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
            className="text-center py-32 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm"
          >
            <Search className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h3 className="text-xl font-black text-neutral-800 dark:text-white">No Artworks Found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Try selecting a different artist or category.</p>
          </motion.div>
        )}

        {/* 🖼️ DYNAMIC MASONRY GALLERY */}
        {!isLoadingArtworks && filteredArtworks.length > 0 && (
          <motion.div 
            layout
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
          >
            <AnimatePresence>
              {filteredArtworks.map((artwork) => (
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
                  className="break-inside-avoid relative group rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer shadow-lg hover:shadow-2xl transition-all"
                >
                  <motion.div
                    animate={{ scale: hoveredCard === artwork.id ? 1.05 : 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full h-full"
                  >
                    <img
                      src={artwork.image_url.startsWith('/') ? `http://127.0.0.1:8000${artwork.image_url}` : artwork.image_url}
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
                            <img src={artwork.artist.avatar_url} alt={artwork.artist.display_name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                              {artwork.artist.display_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-white">by {artwork.artist.display_name}</span>
                        </div>
                      )}

                      {artwork.character && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-500/80 backdrop-blur-sm text-white rounded-md w-fit mb-3 block shadow-sm border border-blue-400/50">
                          {artwork.character.name}
                        </span>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
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
      </div>

      {/* 🔍 CINEMATIC FULLSCREEN LIGHTBOX */}
      <AnimatePresence>
        {activeArtwork && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => setActiveArtwork(null)}
              className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xl"
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div 
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-neutral-900 border border-neutral-800 rounded-[2rem] max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Image Section */}
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-6 relative group">
                <img
                  src={activeArtwork.image_url.startsWith('/') ? `http://127.0.0.1:8000${activeArtwork.image_url}` : activeArtwork.image_url}
                  alt={activeArtwork.title}
                  className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>

              {/* Details Section */}
              <div className="w-full md:w-96 bg-neutral-900 p-8 flex flex-col justify-between space-y-6 border-t md:border-t-0 md:border-l border-neutral-800 overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 inline-block mb-3">
                      {activeArtwork.work_type}
                    </span>
                    <h2 className="text-3xl font-black text-white leading-tight">{activeArtwork.title}</h2>
                  </div>
                  
                  <div className="h-px w-full bg-gradient-to-r from-neutral-800 to-transparent"></div>

                  <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line">
                    {activeArtwork.description || 'No additional artwork description provided.'}
                  </p>

                  {activeArtwork.character && (
                    <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Featured Character</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm font-bold text-white">
                          {activeArtwork.character.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeArtwork.artist && (
                    <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Created By</span>
                      <button 
                        onClick={() => router.push(`/artists/${activeArtwork.artist!.handle}`)}
                        className="flex items-center gap-3 hover:bg-neutral-800 p-2 -ml-2 rounded-xl transition-all cursor-pointer w-full text-left group"
                      >
                        {activeArtwork.artist.avatar_url ? (
                          <img src={activeArtwork.artist.avatar_url} alt={activeArtwork.artist.display_name} className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-blue-500 transition-colors" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white border-2 border-transparent group-hover:border-blue-500 transition-colors">
                            {activeArtwork.artist.display_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="block text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{activeArtwork.artist.display_name}</span>
                          <span className="block text-[11px] font-mono text-neutral-500">@{activeArtwork.artist.handle}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-800">
                  <button
                    onClick={() => setActiveArtwork(null)}
                    className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
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
