'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAuctionById, 
  placeBid, 
  updateAuction, 
  closeAuction, 
  getAuctionMessages, 
  sendAuctionMessage,
  Auction, 
  Bid,
  AuctionMessage 
} from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import {
  Loader2,
  Gavel,
  Clock,
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Trophy,
  Zap,
  CheckCircle2,
  Send,
  HelpCircle,
  BadgeCheck,
  User as UserIcon
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const getAuctionImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

// Countdown Timer Component
function LiveTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculate = () => {
      const diff = +new Date(endTime) - +new Date();
      if (diff <= 0) {
        setTimeLeft('ENDED');
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
  }, [endTime]);

  if (timeLeft === 'ENDED') {
    return (
      <span className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
        Auction Ended
      </span>
    );
  }

  return (
    <span className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
      <Clock className="w-4 h-4 text-emerald-500 animate-pulse" /> {timeLeft}
    </span>
  );
}

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = parseInt(params.id as string, 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations('Auctions');
  const router = useRouter();

  const [bidInput, setBidInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'bids' | 'chat'>('bids');

  // Fetch auction data
  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => getAuctionById(auctionId),
    enabled: !!auctionId,
    refetchInterval: 5000,
  });

  // Fetch auction inquiry messages
  const { data: chatMessages = [], isLoading: loadingChat } = useQuery({
    queryKey: ['auction-messages', auctionId],
    queryFn: () => getAuctionMessages(auctionId),
    enabled: !!auctionId,
    refetchInterval: 3000,
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => sendAuctionMessage(auctionId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction-messages', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      setChatInput('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to send message.';
      alert(msg);
    }
  });

  // Place Bid Mutation
  const placeBidMutation = useMutation({
    mutationFn: (amount: number) => placeBid(auctionId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setSuccessMessage('Your bid was successfully placed!');
      setErrorMessage('');
      setBidInput('');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to place bid. Please try again.';
      setErrorMessage(msg);
      setSuccessMessage('');
    },
  });

  // Update AB Mutation
  const updateAuctionMutation = useMutation({
    mutationFn: (autoBuy: number) => updateAuction(auctionId, { auto_buy: autoBuy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setSuccessMessage('Auto Buy price updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update Auto Buy price.';
      setErrorMessage(msg);
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  });

  // Close Auction Mutation
  const closeAuctionMutation = useMutation({
    mutationFn: () => closeAuction(auctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setSuccessMessage('Auction closed successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to close auction.';
      setErrorMessage(msg);
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  });

  const handleCloseAuction = () => {
    if (confirm('Are you sure you want to close this auction manually? This will end the bidding immediately.')) {
      closeAuctionMutation.mutate();
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessageMutation.mutate(chatInput.trim());
  };

  const insertPromptChip = (promptText: string) => {
    setChatInput(promptText);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-primary,#3b82f6)]" />
        <p className="text-sm font-medium opacity-70">Loading Auction Room...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 opacity-50 mb-4" />
        <h2 className="text-xl font-bold mb-2">Auction Not Found</h2>
        <p className="text-xs opacity-70 mb-6">This auction might have been removed or does not exist.</p>
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Auctions
        </Link>
      </div>
    );
  }

  const bids = auction.bids || [];
  const highestBid = bids.length > 0 ? bids[0].amount : null;
  const currentPrice = highestBid ?? auction.starting_bid;
  const minNextBid = highestBid ? highestBid + auction.bid_increment : auction.starting_bid;
  const isEnded = auction.status === 'ENDED' || new Date(auction.end_time) <= new Date();

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bidInput);
    if (isNaN(amount) || amount < minNextBid) {
      setErrorMessage(`Bid must be at least ฿${minNextBid}.`);
      return;
    }
    placeBidMutation.mutate(amount);
  };

  const handleQuickBidAdd = (increment: number) => {
    const target = currentPrice + increment;
    setBidInput(target.toString());
  };

  const handleAutoBuy = () => {
    if (auction.auto_buy && confirm(`Auto Buy this auction for ฿${auction.auto_buy}?`)) {
      placeBidMutation.mutate(auction.auto_buy);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] pb-20 transition-colors duration-200">
      {/* Dynamic Header Bar bound to active Theme Variables */}
      <div className="border-b border-[var(--border-subtle,#27272a)] bg-[var(--bg-surface,#121215)]/90 backdrop-blur-md sticky top-16 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link
          href="/auctions"
          className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary,#f4f4f5)] hover:opacity-80 transition-opacity bg-[var(--bg-primary,#09090b)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle,#27272a)]"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> Back to Auctions
        </Link>

        <div className="flex items-center gap-3">
          {user && user.is_admin && !isEnded && (
            <button
              onClick={handleCloseAuction}
              disabled={closeAuctionMutation.isPending}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {closeAuctionMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Close Auction
            </button>
          )}
          <span className="text-xs font-extrabold px-3 py-1 rounded-full border uppercase bg-[var(--accent-primary,#3b82f6)]/10 text-[var(--accent-primary,#3b82f6)] border-[var(--accent-primary,#3b82f6)]/30">
            {auction.auction_type}
          </span>
          <LiveTimer endTime={auction.end_time} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Global Alert Messages */}
        {errorMessage && (
          <div className="mb-6 text-rose-500 text-xs flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-2xl animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 text-emerald-500 text-xs bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl text-center font-bold animate-in fade-in duration-200">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Artwork Image & Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Image Box */}
          <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl overflow-hidden shadow-xl relative group">
            {auction.image_url ? (
              <img
                src={getAuctionImageUrl(auction.image_url)}
                alt={auction.title}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-[var(--bg-primary,#09090b)] p-6">
                <Gavel className="w-16 h-16 mb-3 text-[var(--accent-primary,#3b82f6)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted,#a1a1aa)]">Commission Slot Auction</span>
              </div>
            )}
          </div>

          {/* Auction Info Card */}
          <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 shadow-lg">
            <h1 className="text-2xl font-extrabold text-[var(--text-primary,#f4f4f5)]">{auction.title}</h1>
            
            {/* Artist Badge */}
            {auction.artist && (
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/artists/${auction.artist!.handle}`);
                }}
                className="flex items-center gap-2 hover:bg-[var(--bg-primary,#09090b)] p-1.5 pr-3 rounded-full transition-colors w-fit border border-[var(--border-subtle,#27272a)] cursor-pointer"
              >
                {auction.artist.avatar_url ? (
                  <img src={auction.artist.avatar_url} alt={auction.artist.display_name} className="w-6 h-6 rounded-full object-cover border border-neutral-700" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-primary,#3b82f6)] flex items-center justify-center text-[10px] font-bold text-white border border-neutral-700">
                    {auction.artist.display_name.charAt(0)}
                  </div>
                )}
                <span className="text-[11px] font-medium text-[var(--text-primary,#f4f4f5)]">by {auction.artist.display_name}</span>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted,#a1a1aa)] whitespace-pre-line leading-relaxed border-b border-[var(--border-subtle,#27272a)] pb-4">
              {auction.description}
            </p>

            {/* Price Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[var(--bg-primary,#09090b)] p-3 rounded-2xl border border-[var(--border-subtle,#27272a)]">
                <span className="text-[var(--text-muted,#a1a1aa)] block text-[10px] uppercase font-bold">Starting Bid</span>
                <span className="text-[var(--text-primary,#f4f4f5)] font-bold text-sm font-mono">฿{auction.starting_bid}</span>
              </div>
              <div className="bg-[var(--bg-primary,#09090b)] p-3 rounded-2xl border border-[var(--border-subtle,#27272a)]">
                <span className="text-[var(--text-muted,#a1a1aa)] block text-[10px] uppercase font-bold">Min Increment</span>
                <span className="text-[var(--text-primary,#f4f4f5)] font-bold text-sm font-mono">฿{auction.bid_increment}</span>
              </div>
              <div className="bg-[var(--bg-primary,#09090b)] p-3 rounded-2xl border border-[var(--border-subtle,#27272a)]">
                <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted,#a1a1aa)] mb-0.5">
                  <span>Auto Buy (AB)</span>
                  {user && user.is_admin && (
                    <button
                      type="button"
                      onClick={() => {
                        const val = prompt('Set Auto Buy (AB) Price in ฿:', auction.auto_buy ? auction.auto_buy.toString() : '');
                        if (val !== null) {
                          const parsed = parseFloat(val);
                          if (!isNaN(parsed) && parsed > 0) {
                            updateAuctionMutation.mutate(parsed);
                          }
                        }
                      }}
                      className="text-[9px] font-bold text-[var(--accent-primary,#3b82f6)] hover:underline cursor-pointer"
                    >
                      {auction.auto_buy ? 'Edit AB' : '+ Set AB'}
                    </button>
                  )}
                </div>
                <span className="text-[var(--accent-primary,#3b82f6)] font-extrabold text-sm font-mono">{auction.auto_buy ? `฿${auction.auto_buy}` : 'None'}</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30">
                <span className="text-emerald-500 block text-[10px] uppercase font-bold">Current Price</span>
                <span className="text-emerald-500 font-extrabold text-base font-mono">฿{currentPrice}</span>
              </div>
            </div>

            {/* Winner Badge if ended */}
            {auction.winner_id && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-500 font-extrabold text-xs">
                  <Trophy className="w-4 h-4" /> AUCTION WINNER
                </div>
                <div className="text-sm text-[var(--text-primary,#f4f4f5)] font-bold">
                  {auction.winner_name || 'Anonymous Client'}
                </div>
                <div className="text-xs text-emerald-500 font-mono">
                  Winning Bid: <strong>฿{auction.winning_bid}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tabbed Room (7 cols) - Live Bidding Feed & Inquiry Chat */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* Room Selector Header Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle,#27272a)] pb-3">
            <div className="flex items-center gap-2 bg-[var(--bg-surface,#121215)] p-1 rounded-2xl border border-[var(--border-subtle,#27272a)]">
              <button
                type="button"
                onClick={() => setRightPanelTab('bids')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  rightPanelTab === 'bids'
                    ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                    : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
                }`}
              >
                <Gavel className="w-4 h-4" /> ประวัติเสนอราคา ({bids.length})
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('chat')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  rightPanelTab === 'chat'
                    ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                    : 'text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#f4f4f5)]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> แชทสอบถาม ({chatMessages.length})
              </button>
            </div>

            <span className="text-[11px] font-mono text-[var(--text-muted,#a1a1aa)]">
              {rightPanelTab === 'bids' ? 'Live Bidding' : 'Q&A Chat Room'}
            </span>
          </div>

          {/* TAB 1: Live Comment-Style Bid Feed Room */}
          {rightPanelTab === 'bids' && (
            <>
              <div className="flex-1 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin shadow-lg">
                {bids.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted,#a1a1aa)] space-y-2">
                    <Gavel className="w-12 h-12 opacity-40 mx-auto" />
                    <p className="text-xs font-bold">No bids placed yet.</p>
                    <p className="text-[11px] opacity-70">Be the first to place a bid on this item!</p>
                  </div>
                ) : (
                  bids.map((bid, index) => {
                    const isTopBid = index === 0;
                    return (
                      <div
                        key={bid.id}
                        className={`p-4 rounded-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 relative ${
                          isTopBid
                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-xs'
                            : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
                              isTopBid
                                ? 'bg-emerald-500 text-white font-extrabold'
                                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-primary,#f4f4f5)] border border-[var(--border-subtle,#27272a)]'
                            }`}>
                              {bid.bidder_name ? bid.bidder_name.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[var(--text-primary,#f4f4f5)]">
                                  {bid.bidder_name}
                                </span>
                                {isTopBid && (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/30 flex items-center gap-1 uppercase tracking-wider animate-pulse">
                                    ★ Highest Bidder
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--text-muted,#a1a1aa)] font-mono block mt-0.5">
                                {new Date(bid.created_at).toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-base font-extrabold font-mono ${
                              isTopBid ? 'text-emerald-500' : 'text-[var(--text-primary,#f4f4f5)]'
                            }`}>
                              ฿{bid.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle,#27272a)] text-xs flex items-center justify-between">
                          <span className="text-[11px] text-[var(--text-muted,#a1a1aa)] italic">
                            Placed bid of ฿{bid.amount.toLocaleString()}
                          </span>
                          {isTopBid && (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Leading
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Interactive Bidding Panel Form */}
              {!isEnded ? (
                user ? (
                  <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] flex items-center gap-1.5 uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> Quick Place Bid
                      </span>
                      <span className="text-[11px] text-[var(--text-muted,#a1a1aa)]">
                        Min Next Bid: <strong className="text-emerald-500 font-mono">฿{minNextBid}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickBidAdd(50)}
                        className="px-3 py-1.5 bg-[var(--bg-primary,#09090b)] hover:opacity-80 text-[var(--text-primary,#f4f4f5)] rounded-xl text-xs font-bold border border-[var(--border-subtle,#27272a)] transition-all cursor-pointer"
                      >
                        + ฿50
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickBidAdd(100)}
                        className="px-3 py-1.5 bg-[var(--bg-primary,#09090b)] hover:opacity-80 text-[var(--text-primary,#f4f4f5)] rounded-lg text-xs font-bold border border-[var(--border-subtle,#27272a)] transition-all cursor-pointer"
                      >
                        + ฿100
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickBidAdd(500)}
                        className="px-3 py-1.5 bg-[var(--bg-primary,#09090b)] hover:opacity-80 text-[var(--text-primary,#f4f4f5)] rounded-lg text-xs font-bold border border-[var(--border-subtle,#27272a)] transition-all cursor-pointer"
                      >
                        + ฿500
                      </button>
                      {auction.auto_buy && (
                        <button
                          type="button"
                          onClick={handleAutoBuy}
                          className="px-3.5 py-1.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md ml-auto"
                        >
                          ⚡ Auto Buy ฿{auction.auto_buy}
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleBidSubmit} className="flex gap-3 pt-1">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-muted,#a1a1aa)] text-xs font-bold">
                          ฿
                        </span>
                        <input
                          type="number"
                          required
                          min={minNextBid}
                          step="any"
                          placeholder={`Enter ฿${minNextBid} or higher`}
                          value={bidInput}
                          onChange={(e) => setBidInput(e.target.value)}
                          className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-xl py-3 pl-8 pr-3 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={placeBidMutation.isPending}
                        className="bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-2"
                      >
                        {placeBidMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Place Bid
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 text-center space-y-3">
                    <p className="text-xs text-[var(--text-muted,#a1a1aa)] font-bold">Log in to participate in live bidding</p>
                    <Link
                      href="/login"
                      className="inline-block bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
                    >
                      Log In to Bid
                    </Link>
                  </div>
                )
              ) : (
                <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 text-center text-[var(--text-muted,#a1a1aa)] text-xs font-bold">
                  This auction has ended. No further bids can be accepted.
                </div>
              )}
            </>
          )}

          {/* TAB 2: Auction Inquiry & Q&A Chat Room */}
          {rightPanelTab === 'chat' && (
            <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 flex flex-col min-h-[480px] shadow-lg">
              
              {/* Info Bar */}
              <div className="bg-[var(--accent-primary,#3b82f6)]/10 border border-[var(--accent-primary,#3b82f6)]/20 p-3.5 rounded-2xl text-xs text-[var(--text-primary,#f4f4f5)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[var(--accent-primary,#3b82f6)] shrink-0" />
                  <span>ส่งคำถามสอบถามศิลปินผู้จัดประมูลเกี่ยวกับงาน สิทธิ์การใช้งาน หรือรายละเอียดเพิ่มเติม</span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[360px] pr-2 no-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted,#a1a1aa)] space-y-2">
                    <MessageSquare className="w-12 h-12 opacity-40 mx-auto" />
                    <p className="text-xs font-bold">ยังไม่มีคำถามยื่นในรายการประมูลนี้</p>
                    <p className="text-[11px] opacity-70">เป็นคนแรกที่ส่งคำถามเกี่ยวกับรายละเอียดชิ้นงานได้ทันที</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl border transition-all text-xs space-y-1.5 ${
                        msg.is_artist
                          ? 'bg-[var(--accent-primary,#3b82f6)]/10 border-[var(--accent-primary,#3b82f6)]/30 text-[var(--text-primary,#f4f4f5)] ml-4'
                          : 'bg-[var(--bg-primary,#09090b)] border-[var(--border-subtle,#27272a)] mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${msg.is_artist ? 'text-[var(--accent-primary,#3b82f6)] flex items-center gap-1' : 'text-[var(--text-primary,#f4f4f5)]'}`}>
                            {msg.is_artist && <BadgeCheck className="w-3.5 h-3.5 text-[var(--accent-primary,#3b82f6)]" />}
                            {msg.sender_name}
                          </span>
                          {msg.is_artist && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--accent-primary,#3b82f6)]/20 text-[var(--accent-primary,#3b82f6)] border border-[var(--accent-primary,#3b82f6)]/30">
                              ARTIST / CREATOR
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted,#a1a1aa)] font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[var(--text-primary,#f4f4f5)] leading-relaxed font-sans">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Inquiry Quick Prompt Chips */}
              <div className="pt-2 border-t border-[var(--border-subtle,#27272a)]">
                <span className="text-[10px] font-bold text-[var(--text-muted,#a1a1aa)] uppercase tracking-wider block mb-1.5">
                  คำถามที่พบบ่อย (Quick Questions):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertPromptChip('ขอสอบถามเกี่ยวกับสิทธิ์การนำไปใช้เชิงพาณิชย์ (Commercial Use) ครับ')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary,#09090b)] hover:opacity-80 border border-[var(--border-subtle,#27272a)] text-[11px] text-[var(--text-primary,#f4f4f5)] transition-all cursor-pointer"
                  >
                    ❓ สิทธิ์พาณิชย์
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPromptChip('ชิ้นงานมีไฟล์แยก Layer PSD หรือไฟล์โปร่งแสง PNG ให้ด้วยไหมครับ')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary,#09090b)] hover:opacity-80 border border-[var(--border-subtle,#27272a)] text-[11px] text-[var(--text-primary,#f4f4f5)] transition-all cursor-pointer"
                  >
                    ❓ ไฟล์ PSD/PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPromptChip('ใช้ระยะเวลาจัดส่งมอบชิ้นงานสมบูรณ์กี่วันหลังปิดประมูลครับ')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary,#09090b)] hover:opacity-80 border border-[var(--border-subtle,#27272a)] text-[11px] text-[var(--text-primary,#f4f4f5)] transition-all cursor-pointer"
                  >
                    ❓ ระยะเวลาส่งมอบ
                  </button>
                </div>
              </div>

              {/* Chat Input Form */}
              {user ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="พิมพ์คำถามสอบถามศิลปิน..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                  />
                  <button
                    type="submit"
                    disabled={sendMessageMutation.isPending || !chatInput.trim()}
                    className="px-4 py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    ส่งคำถาม
                  </button>
                </form>
              ) : (
                <div className="text-center py-2 text-xs text-[var(--text-muted,#a1a1aa)]">
                  <Link href="/login" className="text-[var(--accent-primary,#3b82f6)] font-bold hover:underline">
                    เข้าสู่ระบบเพื่อพิมพ์สอบถามคำถาม
                  </Link>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
      </div>
    </div>
  );
}
