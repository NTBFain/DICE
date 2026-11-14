'use client';

import { useQuery } from '@tanstack/react-query';
import { getCharacters } from '@/lib/api';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function CharactersPage() {
  const t = useTranslations('Characters');
  
  const { data: characters, isLoading, isError } = useQuery({
    queryKey: ['characters'],
    queryFn: getCharacters,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
          <Users className="w-10 h-10 text-blue-500" />
          {t('title')}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-lg">
          {t('description')}
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-neutral-500 dark:text-neutral-500 font-medium">{t('loading')}</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center max-w-lg mx-auto">
          {t('error')}
        </div>
      )}

      {!isLoading && !isError && characters?.length === 0 && (
        <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <Users className="w-16 h-16 text-neutral-700 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-neutral-700 dark:text-neutral-300">{t('emptyTitle')}</h3>
          <p className="text-neutral-500 dark:text-neutral-500 mt-2">{t('emptyDescription')}</p>
        </div>
      )}

      {!isLoading && characters && characters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((char) => (
            <article
              key={char.id}
              className="group block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 relative shadow-sm cursor-pointer"
            >
              <Link href={`/portfolio?character=${char.id}`} aria-label={t('galleryFor',{name:char.name})} className="absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"><span className="sr-only">{t('galleryFor',{name:char.name})}</span></Link>
              {char.image_url ? (
                <div className="h-64 w-full relative overflow-hidden bg-neutral-950">
                  <img
                    src={char.image_url.startsWith('http') ? char.image_url : (char.image_url.startsWith('/') ? char.image_url : `/${char.image_url}`)}
                    alt={char.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: char.theme_color || '#3b82f6' }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {t('character')}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {char.name}
                    </h3>
                    
                    {/* Artist Badge */}
                    {char.artist && (
                      <Link href={`/artists/${char.artist!.handle}`} aria-label={t('artistProfile',{name:char.artist.display_name})} className="relative z-20 flex items-center gap-1.5 mb-2 hover:bg-white/20 p-1 pr-2 rounded-full transition-colors w-fit border border-white/10 shadow-sm"
                      >
                        {char.artist.avatar_url ? (
                          <img src={char.artist.avatar_url} alt={char.artist.display_name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                            {char.artist.display_name.charAt(0)}
                          </div>
                        )}
                        <span className="text-[10px] font-medium text-white/90">{t('byArtist',{name:char.artist.display_name})}</span>
                      </Link>
                    )}
                    
                    <p className="text-neutral-300 text-xs line-clamp-2 mb-3">
                      {char.description || t('defaultDescription')}
                    </p>
                    <div className="flex items-center text-xs font-bold text-blue-400 uppercase tracking-wider">
                      {t('explore')} <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="h-28 w-full relative border-b border-neutral-800"
                    style={{ backgroundColor: char.theme_color || '#3b82f6' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/50"></div>
                  </div>
                  <div className="p-5 relative">
                    <div 
                      className="w-14 h-14 rounded-xl absolute -top-7 bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center shadow-md"
                      style={{ backgroundColor: char.theme_color || '#1e3a8a' }}
                    >
                      <span className="text-white font-black text-xl">
                        {char.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-7">
                      <h3 className="text-xl font-extrabold text-white mb-1 group-hover:text-blue-400 transition-colors">
                        {char.name}
                      </h3>

                      {/* Artist Badge */}
                      {char.artist && (
                        <Link href={`/artists/${char.artist!.handle}`} aria-label={t('artistProfile',{name:char.artist.display_name})} className="relative z-20 flex items-center gap-1.5 mb-2 hover:bg-neutral-800 p-1 pr-2 rounded-full transition-colors w-fit border border-neutral-800 shadow-sm"
                        >
                          {char.artist.avatar_url ? (
                            <img src={char.artist.avatar_url} alt={char.artist.display_name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                              {char.artist.display_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-white/90">{t('byArtist',{name:char.artist.display_name})}</span>
                        </Link>
                      )}

                      <p className="text-neutral-400 text-xs line-clamp-2 mb-4">
                        {char.description || t('defaultDescription')}
                      </p>
                      <div className="flex items-center text-xs font-bold text-blue-400">
                        {t('explore')} <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
