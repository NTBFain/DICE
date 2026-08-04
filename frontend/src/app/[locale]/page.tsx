'use client';

import { useState, useEffect } from 'react';
import { getMarketplaceArtists, ArtistProfile } from '@/lib/marketplaceApi';
import ArtistCard from '@/components/ArtistCard';
import { Users, Search, Sparkles, Loader2, Compass } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';

const STYLE_CATEGORIES = [
  { id: 'ALL', label: '🎨 ศิลปินทั้งหมด' },
  { id: 'VTuber 2D', label: '👾 VTuber 2D Model' },
  { id: 'Character Sheet', label: '📜 Concept Sheet' },
  { id: 'Chibi', label: '✨ Chibi & Emotes' },
  { id: 'Environment', label: '🏞️ Fantasy Environment' },
];

export default function Home() {
  const { user } = useAuth();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [onlyOpenCommissions, setOnlyOpenCommissions] = useState(false);

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedStyle, onlyOpenCommissions]);

  const fetchData = async () => {
    setLoading(true);
    const data = await getMarketplaceArtists({
      query: searchQuery,
      style: selectedStyle,
      status: onlyOpenCommissions ? 'OPEN' : undefined,
    });
    setArtists(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      
      {/* 🚀 MAIN HOMEPAGE HERO: MULTI-ARTIST SELECTION HUB */}
      <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden space-y-6 animate-fade-in-up">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--accent-primary,#3b82f6)] uppercase tracking-widest bg-[var(--accent-primary,#3b82f6)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary,#3b82f6)]/30">
            <Compass className="w-3.5 h-3.5 text-[var(--accent-primary,#3b82f6)]" /> DICE Multi-Artist Marketplace Platform
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--text-primary,#f4f4f5)] leading-tight">
            ค้นหาและเลือก <span className="text-[var(--accent-primary,#3b82f6)]">ศิลปิน 2D มืออาชีพ</span> สำหรับงานของคุณ
          </h1>
          <p className="text-sm text-[var(--text-muted,#a1a1aa)] leading-relaxed">
            ศูนย์รวมศิลปิน 2D Character Design, VTuber Rigging, และ Concept Art ชั้นนำ เลือกชมโปรไฟล์ ตรวจสอบเรตราคา เช็กคิวงาน และยื่นสั่งคอมมิชชันกับศิลปินที่คุณชื่นชอบได้ทันที
          </p>

          {(!user || !user.is_admin) && (
            <div className="pt-2">
              <Link
                href="/artists/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold text-xs transition-all shadow-md"
              >
                ✨ คุณเป็นศิลปิน? ลงทะเบียนเข้าร่วมแพลตฟอร์มที่นี่ →
              </Link>
            </div>
          )}
        </div>

        {/* 🔍 SEARCH & FILTER BAR */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted,#a1a1aa)] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อศิลปิน, สไตล์งาน, หรือแท็ก เช่น Kiriko, VTuber, Chibi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)] shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyOpenCommissions(!onlyOpenCommissions)}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              onlyOpenCommissions
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            เฉพาะศิลปินที่เปิดรับงาน (Open Only)
          </button>
        </div>

        {/* STYLE CATEGORY PILLS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
          {STYLE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedStyle(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                selectedStyle === cat.id
                  ? 'bg-[var(--accent-primary,#3b82f6)] text-white border-[var(--accent-primary,#3b82f6)] shadow-md'
                  : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🎨 ARTIST DIRECTORY GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle,#27272a)]">
          <h2 className="text-xl font-extrabold text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent-primary,#3b82f6)]" /> รายชื่อศิลปินในแพลตฟอร์ม ({artists.length})
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)]">Multi-Artist Marketplace Directory</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
            <Loader2 className="w-8 h-8 text-[var(--accent-primary,#3b82f6)] animate-spin mb-2" />
            <span className="text-xs text-[var(--text-muted,#a1a1aa)] font-bold uppercase tracking-widest">Loading Artists Marketplace...</span>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-24 bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl">
            <Users className="w-12 h-12 text-[var(--text-muted,#a1a1aa)] opacity-40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary,#f4f4f5)]">ไม่พบศิลปินที่ตรงกับเงื่อนไขการค้นหา</h3>
            <p className="text-xs text-[var(--text-muted,#a1a1aa)] mt-1">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองหมวดหมู่</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
