'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuctions, placeBid, Auction, Bid } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { Loader2, Gavel, Clock, Trophy, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const getAuctionImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const host = typeof window !== 'undefined'
      ? (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname)
      : '127.0.0.1';
    return `http://${host}:8000${url}`;
  }
  return url;
};

// Countdown Timer Component
function CountdownTimer({ endTime, onEnd }: { endTime: string; onEnd: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');

  useState(() => {
    const calculate = () => {
      const diff = +new Date(endTime) - +new Date();
      if (diff <= 0) {
        setTimeLeft('ENDED');
        onEnd();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setTimeLeft(parts.join(' '));
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  });

  if (timeLeft === 'ENDED') {
    return (
      <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
        Auction Ended
      </span>
    );
  }

  return (
    <span className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-mono font-bold flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> {timeLeft}
    </span>
  );
}

export default function AuctionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations('Auctions');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active');
  const [bidInputs, setBidInputs] = useState<{ [key: number]: string }>({});
  const [errorMessages, setErrorMessages] = useState<{ [key: number]: string }>({});
  const [successMessages, setSuccessMessages] = useState<{ [key: number]: string }>({});

  // Fetch all auctions
  const { data: auctions = [], isLoading, refetch } = useQuery({
    queryKey: ['auctions'],
    queryFn: getAuctions,
    refetchInterval: 5000,
  });

  // Place Bid Mutation
  const placeBidMutation = useMutation({
    mutationFn: ({ auctionId, amount }: { auctionId: number; amount: number }) =>
      placeBid(auctionId, amount),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setSuccessMessages((prev) => ({ ...prev, [variables.auctionId]: 'Bid placed successfully!' }));
      setErrorMessages((prev) => ({ ...prev, [variables.auctionId]: '' }));
      setBidInputs((prev) => ({ ...prev, [variables.auctionId]: '' }));
      setTimeout(() => {
        setSuccessMessages((prev) => ({ ...prev, [variables.auctionId]: '' }));
      }, 3000);
    },
    onError: (err: any, variables) => {
      const msg = err.response?.data?.detail || 'Failed to place bid. Please try again.';
      setErrorMessages((prev) => ({ ...prev, [variables.auctionId]: msg }));
      setSuccessMessages((prev) => ({ ...prev, [variables.auctionId]: '' }));
    },
  });

  const now = new Date();

  const filteredAuctions = auctions.filter((auction) => {
    const isEnded = auction.status === 'ENDED' || new Date(auction.end_time) <= now;
    return activeTab === 'active' ? !isEnded : isEnded;
  });

  const handleBidSubmit = (e: React.FormEvent, auctionId: number, minNextBid: number) => {
    e.preventDefault();
    const inputVal = bidInputs[auctionId];
    const amount = parseFloat(inputVal);

    if (isNaN(amount) || amount < minNextBid) {
      setErrorMessages((prev) => ({ ...prev, [auctionId]: `Bid must be at least ฿${minNextBid}` }));
      return;
    }

    placeBidMutation.mutate({ auctionId, amount });
  };

  const handleAutoBuy = (auctionId: number, autoBuyAmount: number) => {
    if (confirm(`Are you sure you want to Auto Buy this item for ฿${autoBuyAmount}? This will win the auction immediately.`)) {
      placeBidMutation.mutate({ auctionId, amount: autoBuyAmount });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col">
      <div className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-widest">Live Bidding Stage</span>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-neutral-900 dark:text-white">
              <Gavel className="text-blue-500 w-8 h-8" /> {t('title')}
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="self-start md:self-center flex items-center gap-1.5 text-xs bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-4 py-2.5 rounded-2xl transition-all cursor-pointer text-neutral-800 dark:text-white font-bold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-px">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            {t('activeAuctions')}
          </button>
          <button
            onClick={() => setActiveTab('ended')}
            className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'ended'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            {t('endedAuctions')}
          </button>
        </div>

        {/* Loading / Empty States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-2" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg mx-auto shadow-sm">
            <Gavel className="w-14 h-14 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {t('emptyTitle')}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('emptyDesc')}
            </p>
          </div>
        ) : (
          /* Grid of Auction Stage Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-container">
            {filteredAuctions.map((auction) => {
              const bids = auction.bids || [];
              const highestBid = bids.length > 0 ? bids[0].amount : null;
              const currentPrice = highestBid ?? auction.starting_bid;
              const minNextBid = highestBid ? highestBid + auction.bid_increment : auction.starting_bid;
              
              const isAdoptable = auction.auction_type === 'ADOPTABLE';
              
              return (
                <div
                  key={auction.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col group transition-all hover:border-blue-500 shadow-md hover-lift animate-fade-in-up"
                >
                  {/* Image/Visual header */}
                  {isAdoptable && auction.image_url ? (
                    <Link href={`/auctions/${auction.id}`} className="aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950 relative border-b border-neutral-200 dark:border-neutral-800 block">
                      <img
                        src={getAuctionImageUrl(auction.image_url)}
                        alt={auction.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  ) : (
                    <Link href={`/auctions/${auction.id}`} className="aspect-video w-full bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 p-4 block">
                      <Gavel className="w-12 h-12 mb-2 text-blue-500" />
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-center">{t('commissionSlot')}</span>
                    </Link>
                  )}

                  {/* Auction Body info */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase bg-neutral-100 dark:bg-neutral-950 text-blue-600 dark:text-blue-400 border-neutral-200 dark:border-neutral-800">
                          {isAdoptable ? t('adoptable') : t('commissionSlot')}
                        </span>
                        
                        {auction.status === 'ACTIVE' && new Date(auction.end_time) > now ? (
                          <CountdownTimer endTime={auction.end_time} onEnd={refetch} />
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 uppercase">
                            {t('closed')}
                          </span>
                        )}
                      </div>

                      <Link href={`/auctions/${auction.id}`}>
                        <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-1">
                          {auction.title}
                        </h2>
                      </Link>

                      {/* Artist Badge */}
                      {auction.artist && (
                        <div 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/artists/${auction.artist!.handle}`);
                          }}
                          className="flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1 pr-2 rounded-full transition-colors w-fit border border-transparent shadow-sm"
                        >
                          {auction.artist.avatar_url ? (
                            <img src={auction.artist.avatar_url} alt={auction.artist.display_name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                              {auction.artist.display_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">by {auction.artist.display_name}</span>
                        </div>
                      )}

                      <p className="text-neutral-600 dark:text-neutral-400 text-xs line-clamp-3 whitespace-pre-line leading-relaxed">
                        {auction.description}
                      </p>
                    </div>

                    {/* Price parameters */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">{t('startingBid')}</span>
                        <span className="text-neutral-900 dark:text-white font-semibold text-sm">฿{auction.starting_bid}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">{t('minIncrement')}</span>
                        <span className="text-neutral-900 dark:text-white font-semibold text-sm">฿{auction.bid_increment}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">{t('autoBuy')}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">{auction.auto_buy ? `฿${auction.auto_buy}` : t('none')}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">{t('currentPrice')}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">฿{currentPrice}</span>
                      </div>
                    </div>

                    {/* Bidding Action Box */}
                    {auction.status === 'ACTIVE' && new Date(auction.end_time) > now ? (
                      user ? (
                        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-3">
                          <form
                            onSubmit={(e) => handleBidSubmit(e, auction.id, minNextBid)}
                            className="flex gap-2"
                          >
                            <div className="relative flex-1">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500 text-xs font-bold">
                                ฿
                              </span>
                              <input
                                type="number"
                                required
                                min={minNextBid}
                                step="any"
                                placeholder={`Min ฿${minNextBid}`}
                                value={bidInputs[auction.id] || ''}
                                onChange={(e) =>
                                  setBidInputs((prev) => ({ ...prev, [auction.id]: e.target.value }))
                                }
                                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-2xl py-2 pl-7 pr-3 focus:outline-none focus:border-blue-500 text-xs"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={placeBidMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-2xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {t('placeBid')}
                            </button>
                          </form>
                          
                          {auction.auto_buy && (
                            <button
                              type="button"
                              onClick={() => handleAutoBuy(auction.id, auction.auto_buy!)}
                              disabled={placeBidMutation.isPending}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 rounded-2xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                            >
                              {t('autoBuyFor', { amount: auction.auto_buy })}
                            </button>
                          )}

                          {errorMessages[auction.id] && (
                            <div className="text-rose-600 dark:text-rose-400 text-[10px] flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{errorMessages[auction.id]}</span>
                            </div>
                          )}

                          {successMessages[auction.id] && (
                            <div className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-center font-bold">
                              {successMessages[auction.id]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 text-center">
                          <Link
                            href="/login"
                            className="inline-block bg-neutral-100 dark:bg-neutral-950 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-800 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all w-full shadow-xs"
                          >
                            {t('loginToBid')}
                          </Link>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
