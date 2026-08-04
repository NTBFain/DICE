'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerArtistProfile, ArtistRegisterPayload } from '@/lib/api';
import { 
  UserPlus, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon,
  DollarSign,
  Globe
} from 'lucide-react';


const STYLE_OPTIONS = [
  'VTuber 2D',
  'Character Sheet',
  'Anime Full Body',
  'Chibi',
  'Discord Emotes',
  'Bust-Up Icon',
  'Environment',
  'Fantasy Cover'
];

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

export default function ArtistRegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, fetchUser } = useAuth();

  useEffect(() => {
    if (user?.is_admin) {
      router.push('/');
    }
  }, [user, router]);

  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['VTuber 2D', 'Anime Full Body']);
  const [startingPrice, setStartingPrice] = useState('1000');
  const [socialTwitter, setSocialTwitter] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const registerMutation = useMutation({
    mutationFn: (payload: ArtistRegisterPayload) => registerArtistProfile(payload),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      // Important: refresh user state so is_artist becomes true immediately
      await fetchUser();
      
      setSuccessMessage('ลงทะเบียนโปรไฟล์ศิลปินสำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => {
        router.push(`/artists/${data.handle}`);
      }, 1500);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง';
      setErrorMessage(msg);
    }
  });

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanHandle) {
      setErrorMessage('กรุณาระบุ แฮนเดิล (@username) เป็นภาษาอังกฤษและตัวเลขเท่านั้น');
      return;
    }

    const price = parseFloat(startingPrice);
    if (isNaN(price) || price <= 0) {
      setErrorMessage('กรุณาระบุเรตราคาเริ่มต้นเป็นตัวเลขที่ถูกต้อง');
      return;
    }

    if (selectedStyles.length === 0) {
      setErrorMessage('กรุณาเลือกสไตล์งานวาดอย่างน้อย 1 สไตล์');
      return;
    }

    registerMutation.mutate({
      handle: cleanHandle,
      display_name: displayName.trim(),
      tagline: tagline.trim(),
      bio: bio.trim(),
      styles: selectedStyles,
      starting_price: price,
      social_twitter: socialTwitter.trim() || undefined
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle,#27272a)] pb-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary,#f4f4f5)] bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] px-3.5 py-2 rounded-xl hover:opacity-80 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> กลับสู่หน้าหลัก
        </Link>
        <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)]">Creator Registration Portal</span>
      </div>

      {/* Main Registration Box */}
      <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
        
        <div className="space-y-2 border-b border-[var(--border-subtle,#27272a)] pb-6">
          <span className="text-[10px] font-mono font-bold text-[var(--accent-primary,#3b82f6)] uppercase bg-[var(--accent-primary,#3b82f6)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary,#3b82f6)]/30">
            Artist Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-[var(--accent-primary,#3b82f6)]" /> ลงทะเบียนโปรไฟล์ศิลปินใหม่
          </h1>
          <p className="text-xs text-[var(--text-muted,#a1a1aa)] leading-relaxed">
            สร้างโปรไฟล์ศิลปินของคุณเพื่อเปิดรับงานคอมมิชชัน ลงรายการประมูล และแสดงแกลเลอรีผลงานในแพลตฟอร์มกลาง DICE
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-bold justify-center">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Handle & Display Name Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                แฮนเดิลประจำตัว (@username) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-mono font-bold text-[var(--text-muted,#a1a1aa)]">@</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น kiriko_art, neko_chibi"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted,#a1a1aa)]">ใช้สำหรับตั้งเป็นลิงก์โปรไฟล์ส่วนตัวของคุณ</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                ชื่อที่ใช้แสดง / นามปากกา (Display Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น Kiriko Studio (คิริโกะ)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              สโลแกน / ความเชี่ยวชาญสั้นๆ (Tagline) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น 2D Live2D VTuber Models & Anime Character Design Specialist"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              คำแนะนำตัว / รายละเอียดศิลปิน (Bio) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="แนะแนวนำสไตล์งาน ประสบการณ์ และเงื่อนไขการรับงานของคุณ..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
            />
          </div>

          {/* Style Selector Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              เลือกสไตล์งานวาดของคุณ (เลือกได้หลายสไตล์) <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {STYLE_OPTIONS.map((st) => {
                const isSelected = selectedStyles.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleStyle(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--accent-primary,#3b82f6)] text-white border-[var(--accent-primary,#3b82f6)] shadow-xs'
                        : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting Price & Twitter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                ราคาเริ่มต้นแพ็กเกจ (฿) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-[var(--text-muted,#a1a1aa)]">฿</span>
                <input
                  type="number"
                  required
                  min={100}
                  placeholder="1000"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                Twitter / X Handle
              </label>
              <input
                type="text"
                placeholder="เช่น @kiriko_art"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
              />
            </div>
          </div>



          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--border-subtle,#27272a)] flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 bg-[var(--bg-primary,#09090b)] hover:opacity-80 text-[var(--text-primary,#f4f4f5)] border border-[var(--border-subtle,#27272a)] font-bold rounded-2xl text-xs transition-all"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-6 py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              ยืนยันการลงทะเบียนศิลปิน
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
