'use client';

import { ArtistProfile } from '../lib/marketplaceApi';
import { BadgeCheck, Star, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function ArtistCard({ artist }: { artist: ArtistProfile }) {
  const t = useTranslations('ArtistCard');
  const isOpen = artist.commission_status === 'OPEN';
  const isWaitlist = artist.commission_status === 'WAITLIST';

  return (
    <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-lg group hover:border-[var(--accent-primary,#3b82f6)] transition-all duration-300 hover:-translate-y-1">
      <div>
        {/* Cover Banner */}
        <div className="h-28 sm:h-32 w-full bg-neutral-800 relative overflow-hidden">
          {artist.banner_url ? (
            <img
              src={artist.banner_url}
              alt={artist.display_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-[var(--accent-soft)]" />
          )}

          {/* Status Badge */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
            <span className={`text-[9px] sm:text-[10px] font-extrabold px-2.5 py-0.5 sm:py-1 rounded-full border uppercase shadow-md backdrop-blur-md ${
              isOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isWaitlist ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/40'
            }`}>
              {isOpen ? t('open') : isWaitlist ? t('waitlist') : t('closed')}
            </span>
          </div>
        </div>

        {/* Avatar & Core Profile Info */}
        <div className="px-4 sm:px-6 pt-3 pb-3 sm:pb-4 relative">
          <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
            <div className="relative -mt-10 sm:-mt-12 shrink-0">
              <img
                src={artist.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={artist.display_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover border-3 sm:border-4 border-[var(--bg-surface,#121215)] shadow-xl"
              />
              {artist.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 sm:p-1 shadow-md">
                  <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">{t('startingAt')}</span>
              <span className="text-base sm:text-lg font-black text-[var(--accent-primary,#3b82f6)] font-mono">฿{artist.starting_price.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary,#f4f4f5)] group-hover:text-[var(--accent-primary,#3b82f6)] transition-colors flex items-center gap-1.5 truncate">
              {artist.display_name}
            </h3>
            <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)] block truncate">@{artist.handle}</span>
            <p className="text-xs text-[var(--text-muted,#a1a1aa)] line-clamp-2 leading-relaxed pt-1">
              {artist.tagline || artist.bio}
            </p>
          </div>

          {/* Style Chips */}
          <div className="flex flex-wrap gap-1.5 pt-2.5 sm:pt-3.5">
            {artist.styles.map((style, idx) => (
              <span
                key={idx}
                className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] border border-[var(--border-subtle,#27272a)]"
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Stats & Action CTA */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2.5 sm:pt-3 border-t border-[var(--border-subtle,#27272a)] bg-[var(--bg-primary,#09090b)]/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1 font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
            <span>{artist.rating}</span>
          </div>
          <span className="text-[var(--text-muted,#a1a1aa)] font-mono text-[10px] sm:text-[11px]">
            {artist.total_completed_orders} {t('orders')}
          </span>
        </div>

        <Link
          href={`/artists/${artist.handle}`}
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 studio-primary rounded-lg sm:rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1 shrink-0"
        >
          {t('viewProfile')} <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      </div>
    </div>
  );
}
