'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/components/useDialogFocus';
import { getErrorMessage } from '@/lib/errorMessage';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getArtistByHandle, ArtistProfile, ArtistArtwork } from '@/lib/marketplaceApi';
import ArtworkPreview from '@/components/ArtworkPreview';
import { 
  BadgeCheck, 
  Star, 
  Clock, 
  Send, 
  ArrowLeft, 
  Briefcase, 
  MessageSquare,
  Globe,
  Loader2,
  Image as ImageIcon,
  Gavel,
  Users,
  AlertCircle
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { createOrder } from '@/lib/api';
import PriceCalculator, { type EstimateSelection } from '@/components/PriceCalculator';
import QueueRoadmap from '@/components/QueueRoadmap';
import ArtistCommissionSection from '@/components/commission/ArtistCommissionSection';
import ClientReviewForm from '@/components/ClientReviewForm';
import { getSocialLink } from '@/lib/socialLink';

export default function ArtistDedicatedProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const t = useTranslations('ClientDashboard');
  const c = useTranslations('ArtistClient');
  const [previewArtwork, setPreviewArtwork] = useState<ArtistArtwork | null>(null);

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio' | 'auctions' | 'characters' | 'reviews' | 'inquiry'>('services');

  const [inquiryText, setInquiryText] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDesc, setOrderDesc] = useState('');
  const [restoredEstimate, setRestoredEstimate] = useState<EstimateSelection>();
  const briefDialogRef = useRef<HTMLDivElement>(null);
  const [requestError, setRequestError] = useState<{ source: 'inquiry' | 'estimate'; message: string } | null>(null);
  const inquiryTooLong = inquiryText.trim().length > 3000;

  const createOrderMutation = useMutation({
    mutationFn: ({ data }: { data: Parameters<typeof createOrder>[0]; source: 'inquiry' | 'estimate' }) => createOrder(data),
    onSuccess: (order) => {
      setRequestError(null);
      setShowOrderModal(false);
      setOrderTitle('');
      setOrderDesc('');
      setInquirySent(true);
      setInquiryText('');
      setTimeout(() => setInquirySent(false), 5000);
      router.push(`/dashboard/client?order=${order.id}`);
    },
    onError: (error, variables) => {
      setRequestError({ source: variables.source, message: getErrorMessage(error, c('requestError')) });
    },
  });
  useDialogFocus(showOrderModal, briefDialogRef, () => { if (!createOrderMutation.isPending) setShowOrderModal(false); });

  useEffect(() => {
    if (!user || !artist || artist.handle !== handle || new URLSearchParams(window.location.search).get('request') !== 'estimate') return;
    const key = `dice:guest-estimate:${handle}`;
    try {
      const saved = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (typeof draft.brief !== 'string' || draft.brief.length > 3000 ||
          typeof draft.createdAt !== 'number' || Date.now() - draft.createdAt > 30 * 60 * 1000 ||
          !draft.selection || !['bust', 'half', 'full'].includes(draft.selection.characterScope) ||
          !['personal', 'commercial'].includes(draft.selection.usageType) ||
          !['simple', 'complex'].includes(draft.selection.backgroundType) ||
          typeof draft.selection.expressDelivery !== 'boolean') return;
      setRestoredEstimate(draft.selection);
      setOrderTitle(`${artist.display_name} commission`);
      setOrderDesc(draft.brief);
      setShowOrderModal(true);
    } catch {
      setRequestError({ source: 'estimate', message: c('estimateRestoreError') });
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.delete('request');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [user, artist, handle, c]);

  const proceedWithEstimate = (brief: string, selection: EstimateSelection) => {
    if (!user) {
      try {
        sessionStorage.setItem(`dice:guest-estimate:${handle}`, JSON.stringify({ brief, selection, createdAt: Date.now() }));
      } catch {
        setRequestError({ source: 'estimate', message: c('estimateSaveError') });
        return;
      }
      router.push(`/login?redirect=${encodeURIComponent(`/artists/${handle}?request=estimate`)}`);
      return;
    }
    setRequestError(null);
    setOrderTitle(`${artist!.display_name} commission`);
    setOrderDesc(brief);
    setShowOrderModal(true);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle.trim() || !orderDesc.trim() || createOrderMutation.isPending) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setRequestError(null);
    createOrderMutation.mutate({ source: 'estimate', data: {
      title: orderTitle.trim(),
      description: orderDesc.trim(),
      artist_id: artist!.id
    }});
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'inquiry') setActiveTab('inquiry');
    setRestoredEstimate(undefined);
    fetchArtist();
  }, [handle]);

  const fetchArtist = async () => {
    setLoading(true);
    try {
      const data = await getArtistByHandle(handle);
      setArtist(data);
    } catch (err) {
      console.error('Failed to load artist profile:', err);
      setArtist(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim() || inquiryTooLong || createOrderMutation.isPending) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/artists/${handle}?tab=inquiry`)}`);
      return;
    }
    setRequestError(null);
    createOrderMutation.mutate({ source: 'inquiry', data: {
      title: `Direct Inquiry to @${artist!.handle}`,
      description: inquiryText,
      artist_id: artist!.id
    }});
  };

  if (loading) {
    return (
      <div data-page-surface className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[var(--accent-primary,#3b82f6)] animate-spin" />
        <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest">{c('loading')}</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div data-page-surface className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center p-8 text-center text-[var(--text-primary,#f4f4f5)]">
        <AlertCircle className="w-16 h-16 opacity-50 mb-4 text-[var(--text-muted,#a1a1aa)]" />
        <h2 className="text-2xl font-bold mb-2">{c('notFound')}</h2>
        <p className="text-xs text-[var(--text-muted,#a1a1aa)] mb-6">{c('notFoundDescription',{handle})}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> {c('back')}
        </Link>
      </div>
    );
  }

  const isOpen = artist.commission_status === 'OPEN';
  const isWaitlist = artist.commission_status === 'WAITLIST';

  return (
    <div data-page-surface className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] pb-20">
      <ArtworkPreview artwork={previewArtwork} onClose={() => setPreviewArtwork(null)} />
      
      {/* 🖼️ ARTIST COVER BANNER */}
      <div className="h-36 sm:h-44 w-full bg-neutral-800 relative overflow-hidden">
        {artist.banner_url ? (
          <img
            src={artist.banner_url}
            alt={artist.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950" />
        )}

        <div className="absolute top-4 left-4 sm:left-6 z-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 hover:bg-black/80 transition-all shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" /> {c('back')}
          </Link>
        </div>
      </div>

      {/* 👤 ARTIST PROFILE HEADER CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative -mt-12 space-y-5">
        
        <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Avatar & Names */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={artist.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt={artist.display_name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-[var(--bg-surface,#121215)] shadow-xl"
                />
                {artist.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary,#f4f4f5)]">
                    {artist.display_name}
                  </h1>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                    isOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : isWaitlist ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/40'
                  }`}>
                    {isOpen ? c('open') : isWaitlist ? c('waitlist') : c('closed')}
                  </span>
                </div>

                <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)] block">@{artist.handle}</span>
                <p className="text-xs text-[var(--text-muted,#a1a1aa)] max-w-xl leading-relaxed line-clamp-2">
                  {artist.bio}
                </p>
              </div>
            </div>

            {/* Quick Stats Matrix */}
            <div className="flex items-center gap-3 bg-[var(--bg-primary,#09090b)] px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle,#27272a)] shrink-0 font-mono">
              <div className="text-center px-2.5 border-r border-[var(--border-subtle,#27272a)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">{c('rating')}</span>
                <span className="text-sm font-extrabold text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {artist.rating}
                </span>
              </div>
              <div className="text-center px-2.5 border-r border-[var(--border-subtle,#27272a)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">{c('orders')}</span>
                <span className="text-sm font-extrabold text-[var(--text-primary,#f4f4f5)]">{artist.total_completed_orders}</span>
              </div>
              <div className="text-center px-2.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">{c('starting')}</span>
                <span className="text-sm font-extrabold text-[var(--accent-primary,#3b82f6)]">฿{artist.starting_price.toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* Style Chips & Social Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle,#27272a)]">
            <div className="flex flex-wrap gap-1.5">
              {artist.styles.map((style, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] border border-[var(--border-subtle,#27272a)]"
                >
                  {style}
                </span>
              ))}
            </div>

            {([
              { kind: 'twitter', label: 'X / Twitter', value: artist.social_twitter },
              { kind: 'pixiv', label: 'Pixiv', value: artist.social_pixiv },
              { kind: 'discord', label: 'Discord', value: artist.social_discord },
            ] as const).map(contact => {
              if (!contact.value) return null;
              const href = getSocialLink(contact.value, contact.kind);
              return href ? (
                <a key={contact.kind} href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[var(--accent-primary,#3b82f6)] flex items-center gap-1 underline break-all focus-visible:outline-2">
                  <Globe className="w-3.5 h-3.5 shrink-0" /> {contact.label}: {contact.value}
                </a>
              ) : <span key={contact.kind} className="text-xs break-all">{contact.label}: {contact.value}</span>;
            })}
          </div>
        </div>

        {/* 📑 DEDICATED ARTIST TABS: SERVICES, PORTFOLIO, AUCTIONS, CHARACTERS, REVIEWS, CHAT */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--border-subtle,#27272a)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'services'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Briefcase className="w-4 h-4" /> {c('services')} ({artist.services?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'portfolio'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" /> {c('portfolio')} ({artist.artworks?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auctions')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'auctions'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Gavel className="w-4 h-4 text-purple-400" /> {c('auctions')} ({artist.auctions?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'characters'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Users className="w-4 h-4 text-pink-400" /> {c('characters')} ({artist.characters?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {c('reviews')} ({artist.reviews?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inquiry')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'inquiry'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-400" /> {c('inquiry')}
          </button>
        </div>

        {/* 💼 TAB 1: SERVICES & PRICING MENU (VGen-Style Multi-Scale Commission) */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            <ArtistCommissionSection handle={handle} />

            <div className="space-y-8 pt-6 border-t border-[var(--border-subtle,#27272a)]">
              <PriceCalculator key={`${handle}:${JSON.stringify(restoredEstimate)}`} initialSelection={restoredEstimate} onProceed={proceedWithEstimate} />
              {requestError?.source === 'estimate' && !showOrderModal && <p role="alert" className="text-sm text-red-500">{requestError.message}</p>}
              <QueueRoadmap artistId={artist.id} />
            </div>
          </div>
        )}

        {/* 🖼️ TAB 2: ARTIST DEDICATED PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {!artist.artworks || artist.artworks.length === 0 ? (
              <div className="text-center py-20 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
                <ImageIcon className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">{c('emptyPortfolio')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {artist.artworks.map((art) => (
                  <button type="button" key={art.id} aria-label={c('viewArtwork',{title:art.title})} onClick={() => setPreviewArtwork(art)} className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl overflow-hidden group shadow-lg text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500">
                    <div className="aspect-square relative overflow-hidden bg-neutral-950">
                      <img src={art.image_url} alt={art.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                        {art.work_type}
                      </span>
                      <h3 className="text-sm font-extrabold text-[var(--text-primary,#f4f4f5)]">{art.title}</h3>
                      {art.description && <p className="text-xs text-[var(--text-muted,#a1a1aa)] line-clamp-2">{art.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🔨 TAB 3: ARTIST DEDICATED LIVE AUCTIONS */}
        {activeTab === 'auctions' && (
          <div className="space-y-6">
            {!artist.auctions || artist.auctions.length === 0 ? (
              <div className="text-center py-20 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
                <Gavel className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">{c('emptyAuctions')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {artist.auctions.map((auc) => (
                  <div key={auc.id} className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 shadow-lg">
                    {auc.image_url && (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-[var(--border-subtle,#27272a)]">
                        <img src={auc.image_url} alt={auc.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
                        {auc.auction_type}
                      </span>
                      <h3 className="text-base font-extrabold text-[var(--text-primary,#f4f4f5)]">{auc.title}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-primary,#09090b)] p-3 rounded-2xl border border-[var(--border-subtle,#27272a)]">
                      <div>
                        <span className="text-[var(--text-muted,#a1a1aa)] block text-[10px] uppercase font-bold">Starting Bid</span>
                        <span className="font-mono font-bold text-[var(--text-primary,#f4f4f5)]">฿{auc.starting_bid}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted,#a1a1aa)] block text-[10px] uppercase font-bold">Current Price</span>
                        <span className="font-mono font-bold text-emerald-400">฿{auc.current_price}</span>
                      </div>
                    </div>
                    <Link
                      href={`/auctions/${auc.id}`}
                      className="block w-full text-center py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
                    >
                      {c('enterAuction')}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 👥 TAB 4: ARTIST DEDICATED CHARACTERS */}
        {activeTab === 'characters' && (
          <div className="space-y-6">
            {!artist.characters || artist.characters.length === 0 ? (
              <div className="text-center py-20 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
                <Users className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">{c('emptyCharacters')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {artist.characters.map((char) => (
                  <Link href={`/portfolio?character=${char.id}`} key={char.id} className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 flex gap-4 items-center shadow-lg">
                    {char.image_url ? (
                      <img src={char.image_url} alt={char.name} className="w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-md shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-extrabold text-lg text-white shrink-0" style={{ backgroundColor: char.theme_color }}>
                        {char.name.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-primary,#3b82f6)]">{char.tagline}</span>
                      <h3 className="text-base font-extrabold text-[var(--text-primary,#f4f4f5)]">{char.name}</h3>
                      <p className="text-xs text-[var(--text-muted,#a1a1aa)] line-clamp-2">{char.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ⭐ TAB 5: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 shadow-lg">
            <ClientReviewForm handle={handle} artistUserId={artist.user_id} onSubmitted={() => { getArtistByHandle(handle).then(setArtist).catch(console.error); }} />
            <h3 className="text-base font-bold text-[var(--text-primary,#f4f4f5)] border-b border-[var(--border-subtle,#27272a)] pb-3">
              {c('reviewHeading')} ({artist.reviews?.length || 0})
            </h3>

            {!artist.reviews || artist.reviews.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted,#a1a1aa)] text-xs font-bold">
                {c('emptyReviews')}
              </div>
            ) : (
              artist.reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary,#f4f4f5)]">{rev.client_name}</span>
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{rev.rating}.0</span>
                    </div>
                  </div>
                  <p className="text-[var(--text-muted,#a1a1aa)]">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 💬 TAB 6: DIRECT INQUIRY */}
        {activeTab === 'inquiry' && (
          <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[var(--text-primary,#f4f4f5)] border-b border-[var(--border-subtle,#27272a)] pb-3">
              {c('inquiryHeading',{handle:artist.handle})}
            </h3>

            {inquirySent && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold text-center">
                {c('inquirySent')}
              </div>
            )}

            {user ? <form onSubmit={handleSendInquiry} className="space-y-3">
              <textarea
                rows={4}
                required
                aria-label={c('inquiry')} placeholder={c('inquiryPlaceholder',{handle:artist.handle})}
                aria-invalid={inquiryTooLong}
                aria-describedby={inquiryTooLong || requestError?.source === 'inquiry' ? 'direct-inquiry-error' : undefined}
                value={inquiryText}
                onChange={(e) => { setInquiryText(e.target.value); setRequestError(null); }}
                className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl p-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
              />
              {(inquiryTooLong || requestError?.source === 'inquiry') && <p id="direct-inquiry-error" role="alert" className="text-sm text-red-500">{inquiryTooLong ? c('inquiryTooLong') : requestError?.message}</p>}

              <button
                type="submit"
                disabled={!inquiryText.trim() || inquiryTooLong || createOrderMutation.isPending}
                className="px-6 py-3 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-2 ml-auto"
              >
                <Send className="w-4 h-4" /> {c('sendInquiry')}
              </button>
            </form> : <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted,#a1a1aa)]">{c('inquirySignInHint')}</p>
              <Link href={`/login?redirect=${encodeURIComponent(`/artists/${handle}?tab=inquiry`)}`} className="inline-flex px-6 py-3 rounded-2xl bg-[var(--accent-primary,#3b82f6)] text-white text-sm font-bold">{c('inquirySignIn')}</Link>
            </div>}
          </div>
        )}

      </div>

      {/* Create Order Modal */}
      {showOrderModal && typeof document !== 'undefined' && createPortal(
        <div ref={briefDialogRef} role="dialog" aria-modal="true" aria-labelledby="request-title" tabIndex={-1} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-8 shadow-2xl relative">
            <h2 id="request-title" className="text-2xl font-bold text-[var(--text-primary,#f4f4f5)] mb-6">{t('requestArtist', { handle: artist.handle })}</h2>
            <form onSubmit={handleCreateOrder} className="space-y-5">
              {requestError?.source === 'estimate' && <p role="alert" className="text-sm text-red-500">{requestError.message}</p>}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted,#a1a1aa)] uppercase tracking-wider mb-2">
                  {t('projectTitle')}
                </label>
                <input
                  type="text"
                  aria-label={t('projectTitle')}
                  maxLength={120}
                  required
                  placeholder={c('orderTitlePlaceholder')}
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-3 px-4 placeholder-neutral-600 focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted,#a1a1aa)] uppercase tracking-wider mb-2">
                  {t('descBrief')}
                </label>
                <textarea
                  rows={5}
                  aria-label={t('descBrief')}
                  maxLength={3000}
                  required
                  placeholder={c('orderBriefPlaceholder')}
                  value={orderDesc}
                  onChange={(e) => setOrderDesc(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-3 px-4 placeholder-neutral-600 focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] transition-all text-sm"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  disabled={createOrderMutation.isPending}
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] hover:bg-neutral-800 text-[var(--text-primary,#f4f4f5)] font-semibold py-3 rounded-2xl transition-all cursor-pointer text-sm text-center"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending || !orderTitle.trim() || !orderDesc.trim()}
                  className="flex-1 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg text-sm"
                >
                  {createOrderMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('submitBrief')}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

    </div>
  );
}
