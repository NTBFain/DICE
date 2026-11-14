'use client';

import { useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/errorMessage';

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
  const c = useTranslations('ArtistOnboarding');
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
      
      setSuccessMessage(c('success'));
      setTimeout(() => {
        router.push(`/artists/${data.handle}`);
      }, 1500);
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err, c('fallback'));
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
    if (registerMutation.isPending) return;
    setErrorMessage('');
    setSuccessMessage('');

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanHandle) {
      setErrorMessage(c('handleError'));
      return;
    }

    if (!displayName.trim() || !tagline.trim() || !bio.trim()) {
      setErrorMessage(c('requiredFields'));
      return;
    }

    const price = parseFloat(startingPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setErrorMessage(c('priceError'));
      return;
    }

    if (selectedStyles.length === 0) {
      setErrorMessage(c('stylesError'));
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
          <ArrowLeft className="w-4 h-4 text-[var(--accent-primary,#3b82f6)]" /> {' '}{c('back')}{' '}</Link>
        <span className="text-xs font-mono text-[var(--text-muted,#a1a1aa)]">{c('portal')}</span>
      </div>

      {/* Main Registration Box */}
      <div className="bg-[var(--bg-surface,#121215)] border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
        
        <div className="space-y-2 border-b border-[var(--border-subtle,#27272a)] pb-6">
          <span className="text-[10px] font-mono font-bold text-[var(--accent-primary,#3b82f6)] uppercase bg-[var(--accent-primary,#3b82f6)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary,#3b82f6)]/30">
            {' '}{c('onboarding')}{' '}</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary,#f4f4f5)] flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-[var(--accent-primary,#3b82f6)]" /> {' '}{c('title')}{' '}</h1>
          <p className="text-xs text-[var(--text-muted,#a1a1aa)] leading-relaxed">
            {' '}{c('intro')}{' '}</p>
        </div>

        {errorMessage && (
          <div role="alert" className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div role="status" className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-bold justify-center">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Handle & Display Name Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                {' '}{c('handle')}{' '}<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-mono font-bold text-[var(--text-muted,#a1a1aa)]">@</span>
                <input
                  type="text"
                  required
                  placeholder={c('handlePlaceholder')}
                  aria-label={c('handle')} value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted,#a1a1aa)]">{c('handleHelp')}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                {' '}{c('displayName')}{' '}<span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={c('displayNamePlaceholder')}
                aria-label={c('displayName')} value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              {' '}{c('tagline')}{' '}<span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={c('taglinePlaceholder')}
              aria-label={c('tagline')} value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              {' '}{c('bio')}{' '}<span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder={c('bioPlaceholder')}
              aria-label={c('bio')} value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
            />
          </div>

          {/* Style Selector Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
              {' '}{c('styles')}{' '}<span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {STYLE_OPTIONS.map((st, styleIndex) => {
                const isSelected = selectedStyles.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={c(`style${styleIndex}`)}
                    onClick={() => toggleStyle(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--accent-primary,#3b82f6)] text-white border-[var(--accent-primary,#3b82f6)] shadow-xs'
                        : 'bg-[var(--bg-primary,#09090b)] text-[var(--text-muted,#a1a1aa)] border-[var(--border-subtle,#27272a)] hover:text-[var(--text-primary,#f4f4f5)]'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{c(`style${styleIndex}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting Price & Twitter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                {' '}{c('startingPrice')}{' '}<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-[var(--text-muted,#a1a1aa)]">฿</span>
                <input
                  type="number" step="0.01"
                  required
                  min={100}
                  placeholder="1000"
                  aria-label={c('startingPrice')} value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full bg-[var(--bg-primary,#09090b)] border border-[var(--border-subtle,#27272a)] text-[var(--text-primary,#f4f4f5)] rounded-2xl py-2.5 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary,#3b82f6)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary,#f4f4f5)] block">
                {' '}{c('twitter')}{' '}</label>
              <input
                type="text"
                placeholder={c('twitterPlaceholder')}
                aria-label={c('twitter')} value={socialTwitter}
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
              {' '}{c('cancel')}{' '}</Link>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-6 py-2.5 bg-[var(--accent-primary,#3b82f6)] hover:opacity-90 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {' '}{c('submit')}{' '}</button>
          </div>

        </form>
      </div>

    </div>
  );
}
