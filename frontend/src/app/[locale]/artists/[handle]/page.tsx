'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getArtistByHandle, ArtistProfile } from '@/lib/marketplaceApi';
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
  Users
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { createOrder } from '@/lib/api';

export default function ArtistDedicatedProfilePage() {
  const params = useParams();
  const handle = params.handle as string;

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

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setShowOrderModal(false);
      setOrderTitle('');
      setOrderDesc('');
      router.push('/dashboard/client');
    },
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    createOrderMutation.mutate({
      title: orderTitle,
      description: orderDesc,
      artist_id: artist!.id
    });
  };

  useEffect(() => {
    if (handle) {
      fetchArtist();
    }
  }, [handle]);

  const fetchArtist = async () => {
    setLoading(true);
    const res = await getArtistByHandle(handle);
    setArtist(res);
    setLoading(false);
  };

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    setInquirySent(true);
    setInquiryText('');
    setTimeout(() => setInquirySent(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[var(--accent-primary,#3b82f6)] animate-spin" />
        <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest">Loading Artist Profile...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center p-8 text-center text-[var(--text-primary,#f4f4f5)]">
        <h2 className="text-2xl font-bold mb-2">ไม่พบหน้าโปรไฟล์ศิลปินนี้</h2>
        <p className="text-xs text-[var(--text-muted,#a1a1aa)] mb-6">ศิลปินแฮนเดิล @{handle} อาจจะถูกลบหรือไม่มีอยู่ในระบบ</p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-[var(--accent-primary,#3b82f6)] text-white font-bold text-xs rounded-xl"
        >
          กลับสู่หน้าเลือกศิลปิน
        </Link>
      </div>
    );
  }

  const isOpen = artist.commission_status === 'OPEN';

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] pb-20">
      
      {/* 🖼️ ARTIST COVER BANNER */}
      <div className="h-64 sm:h-80 w-full bg-neutral-800 relative overflow-hidden">
        {artist.banner_url ? (
          <img
            src={artist.banner_url}
            alt={artist.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950" />
        )}

        <div className="absolute top-6 left-6 z-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-white bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 hover:bg-black/80 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" /> กลับสู่หน้าเลือกศิลปิน
          </Link>
        </div>
      </div>

      {/* 👤 ARTIST PROFILE HEADER CONTAINER */}
      <div className="max-w-6xl mx-auto px-6 relative -mt-20 space-y-8">
        
        <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Avatar & Names */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <div className="relative">
                <img
                  src={artist.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt={artist.display_name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-[var(--bg-surface,#121215)] shadow-2xl"
                />
                {artist.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary,#f4f4f5)]">
                    {artist.display_name}
                  </h1>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase ${
                    isOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {isOpen ? '● Open for Commission' : '● Waitlist'}
                  </span>
                </div>

                <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)] block">@{artist.handle}</span>
                <p className="text-xs text-[var(--text-muted,#a1a1aa)] max-w-xl leading-relaxed">
                  {artist.bio}
                </p>
              </div>
            </div>

            {/* Quick Stats Matrix */}
            <div className="flex items-center gap-4 bg-[var(--bg-primary,#09090b)] p-4 rounded-2xl border border-[var(--border-subtle,#27272a)] shrink-0 font-mono">
              <div className="text-center px-3 border-r border-[var(--border-subtle,#27272a)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">Rating</span>
                <span className="text-base font-extrabold text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" /> {artist.rating}
                </span>
              </div>
              <div className="text-center px-3 border-r border-[var(--border-subtle,#27272a)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">Orders</span>
                <span className="text-base font-extrabold text-[var(--text-primary,#f4f4f5)]">{artist.total_completed_orders}</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">Starting</span>
                <span className="text-base font-extrabold text-[var(--accent-primary,#3b82f6)]">฿{artist.starting_price.toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* Style Chips & Social Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle,#27272a)]">
            <div className="flex flex-wrap gap-2">
              {artist.styles.map((style, idx) => (
                <span
                  key={idx}
                  className="text-xs font-semibold px-3 py-1 rounded-xl bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] border border-[var(--border-subtle,#27272a)]"
                >
                  {style}
                </span>
              ))}
            </div>

            {artist.social_twitter && (
              <span className="text-xs font-mono text-[var(--accent-primary,#3b82f6)] flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> {artist.social_twitter}
              </span>
            )}
          </div>
        </div>

        {/* 📑 DEDICATED ARTIST TABS: SERVICES, PORTFOLIO, AUCTIONS, CHARACTERS, REVIEWS, CHAT */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--border-subtle,#27272a)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'services'
                ? 'bg-[var(--accent-primary,#3b82f6)] text-white shadow-md'
                : 'bg-[var(--bg-surface,#121215)] text-[var(--text-muted,#a1a1aa)] border border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Briefcase className="w-4 h-4" /> เรตราคา & บริการ ({artist.services?.length || 0})
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
            <ImageIcon className="w-4 h-4 text-emerald-400" /> แกลเลอรีผลงาน ({artist.artworks?.length || 0})
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
            <Gavel className="w-4 h-4 text-purple-400" /> รายการประมูล ({artist.auctions?.length || 0})
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
            <Users className="w-4 h-4 text-pink-400" /> ตัวละคร OC ({artist.characters?.length || 0})
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
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> รีวิวลูกค้า ({artist.reviews?.length || 0})
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
            <MessageSquare className="w-4 h-4 text-blue-400" /> สอบถามตรง
          </button>
        </div>

        {/* 💼 TAB 1: SERVICES & PRICING MENU */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!artist.services || artist.services.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl text-xs text-[var(--text-muted,#a1a1aa)] font-bold">
                ศิลปินยังไม่ได้เพิ่มรายการแพ็กเกจคอมมิชชัน
              </div>
            ) : (
              artist.services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-lg hover:border-[var(--accent-primary,#3b82f6)] transition-all"
                >
                  {svc.sample_image_url && (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-[var(--border-subtle,#27272a)]">
                      <img src={svc.sample_image_url} alt={svc.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded bg-[var(--accent-primary,#3b82f6)]/10 text-[var(--accent-primary,#3b82f6)] border border-[var(--accent-primary,#3b82f6)]/30 uppercase">
                        {svc.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--text-muted,#a1a1aa)] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> ~{svc.estimated_days} Days
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[var(--text-primary,#f4f4f5)]">{svc.title}</h3>
                    <p className="text-xs text-[var(--text-muted,#a1a1aa)] leading-relaxed">{svc.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle,#27272a)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted,#a1a1aa)] block">Starting Package</span>
                      <span className="text-xl font-black text-[var(--accent-primary,#3b82f6)] font-mono">฿{svc.base_price.toLocaleString()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                          return;
                        }
                        setOrderTitle(`Commission Package: ${svc.title}`);
                        setShowOrderModal(true);
                      }}
                      disabled={!isOpen}
                      className={`px-5 py-2.5 hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all shadow-md ${
                        isOpen ? 'bg-[var(--accent-primary,#3b82f6)] cursor-pointer' : 'bg-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      {isOpen ? 'ยื่นสั่งคอมมิชชัน' : 'Waitlist ปิดรับงาน'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🖼️ TAB 2: ARTIST DEDICATED PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {!artist.artworks || artist.artworks.length === 0 ? (
              <div className="text-center py-20 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
                <ImageIcon className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">ศิลปินท่านนี้ยังไม่ได้เพิ่มผลงานในพอร์ต</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {artist.artworks.map((art) => (
                  <div key={art.id} className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl overflow-hidden group shadow-lg">
                    <div className="aspect-square relative overflow-hidden bg-neutral-950">
                      <img src={art.image_url} alt={art.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                        {art.work_type}
                      </span>
                      <h3 className="text-sm font-extrabold text-[var(--text-primary,#f4f4f5)]">{art.title}</h3>
                      {art.description && <p className="text-xs text-[var(--text-muted,#a1a1aa)] line-clamp-2">{art.description}</p>}
                    </div>
                  </div>
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
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">ศิลปินท่านนี้ยังไม่มีการเปิดประมูลในขณะนี้</p>
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
                      href="/auctions"
                      className="block w-full text-center py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
                    >
                      เข้าสู่เวทีประมูล
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
                <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)]">ศิลปินท่านนี้ยังไม่ได้สร้างตัวละคร OC ในระบบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {artist.characters.map((char) => (
                  <div key={char.id} className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 flex gap-4 items-center shadow-lg">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ⭐ TAB 5: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[var(--text-primary,#f4f4f5)] border-b border-[var(--border-subtle,#27272a)] pb-3">
              รีวิวและความพึงพอใจจากผู้ว่าจ้าง ({artist.reviews?.length || 0})
            </h3>

            {!artist.reviews || artist.reviews.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted,#a1a1aa)] text-xs font-bold">
                ยังไม่มีรีวิวข้อความสำหรับศิลปินท่านนี้
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
              ส่งข้อความสอบถามรายละเอียดหรือบรีฟตรงถึง @{artist.handle}
            </h3>

            {inquirySent && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold text-center">
                ส่งข้อความสอบถามถึงศิลปินเรียบร้อยแล้ว! ศิลปินจะได้รับการแจ้งเตือนและตอบกลับโดยเร็วที่สุด
              </div>
            )}

            <form onSubmit={handleSendInquiry} className="space-y-3">
              <textarea
                rows={4}
                required
                placeholder={`พิมพ์ข้อความสอบถามเกี่ยวกับคอมมิชชัน, คิวงาน, หรือรายละเอียดสิทธิ์การใช้กับศิลปิน @${artist.handle}...`}
                value={inquiryText}
                onChange={(e) => setInquiryText(e.target.value)}
                className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl p-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
              />

              <button
                type="submit"
                disabled={!inquiryText.trim()}
                className="px-6 py-3 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-2 ml-auto"
              >
                <Send className="w-4 h-4" /> ส่งข้อความสอบถาม
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Create Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-8 shadow-2xl relative">
            <h2 className="text-2xl font-bold text-[var(--text-primary,#f4f4f5)] mb-6">เริ่มจ้างคอมมิชชันกับ @{artist.handle}</h2>
            <form onSubmit={handleCreateOrder} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted,#a1a1aa)] uppercase tracking-wider mb-2">
                  หัวข้อ / โปรเจกต์
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น VTuber Character Concept Art, Cyberpunk Banner..."
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-3 px-4 placeholder-neutral-600 focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted,#a1a1aa)] uppercase tracking-wider mb-2">
                  รายละเอียดบรีฟแบบละเอียด (Brief)
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="อธิบายไอเดีย สัดส่วนภาพ โทนสี หรือแนบลิงก์รูปภาพอ้างอิง..."
                  value={orderDesc}
                  onChange={(e) => setOrderDesc(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-3 px-4 placeholder-neutral-600 focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] transition-all text-sm"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] hover:bg-neutral-800 text-[var(--text-primary,#f4f4f5)] font-semibold py-3 rounded-2xl transition-all cursor-pointer text-sm text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg text-sm"
                >
                  {createOrderMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  ส่งบรีฟงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
