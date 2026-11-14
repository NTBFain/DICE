'use client';

import { useTranslations } from 'next-intl';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHomepageText, updateHomepageText, HomepageTextSettings, getPortfolio, getCommissionStatus } from '@/lib/api';
import { Loader2, Save, Eye, CheckCircle, Palette, Sparkles, LayoutTemplate, Briefcase, ArrowRight } from 'lucide-react';

export default function HomepageTextEditorAdminModule() {
  const queryClient = useQueryClient();
  const h = useTranslations('HomepageEditor');

  const { data: defaultSettings, isLoading } = useQuery({
    queryKey: ['homepage-text'],
    queryFn: getHomepageText,
  });

  const { data: statusData = { open: false } } = useQuery({
    queryKey: ['commission-status'],
    queryFn: getCommissionStatus,
  });

  const { data: artworks = [] } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
  });

  const [formState, setFormState] = useState<HomepageTextSettings>({
    hero_tag: '2D CHARACTER ATELIER',
    hero_title_1: 'Handcrafted 2D Character',
    hero_title_2: 'Illustrations & Models',
    hero_subtitle: 'Order custom original character designs, VTuber 2D assets, and concept sheets directly from the artist. Transparent milestone delivery with watermarked WIP progress checks.',
    badge_1: '300 DPI Print Ready',
    badge_2: 'Layered PSD Assets',
    badge_3: '50% Milestone Escrow',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (defaultSettings) {
      setFormState(defaultSettings);
    }
  }, [defaultSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<HomepageTextSettings>) => updateHomepageText(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['homepage-text'] });
      setFormState(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleChange = (key: keyof HomepageTextSettings, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formState);
  };

  const heroArtwork = artworks[0];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">{h('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">{h('badge')}</span>
          <h2 className="text-2xl font-extrabold text-white">{h('heading')}</h2>
          <p className="text-xs text-neutral-400 mt-1">{h('intro')}</p>
        </div>

        <button
          onClick={handleSaveSubmit}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
          {' '}{h('saveLive')}{' '}</button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {' '}{h('saved')}{' '}</div>
      )}

      {/* Main Split: Left Form Controls (5 cols), Right Real-Time Interactive Live Preview Canvas (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: Form Text Inputs */}
        <form onSubmit={handleSaveSubmit} className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-extrabold text-white border-b border-neutral-800 pb-3 flex items-center justify-between">
            <span>{h('controls')}</span>
            <span className="text-[10px] text-blue-400 font-mono">{h('sync')}</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-400 font-bold uppercase block mb-1">{h('tag')}</label>
              <input
                type="text"
                aria-label={h('tag')} value={formState.hero_tag}
                onChange={(e) => handleChange('hero_tag', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-neutral-400 font-bold uppercase block mb-1">{h('title1')}</label>
              <input
                type="text"
                aria-label={h('title1')} value={formState.hero_title_1}
                onChange={(e) => handleChange('hero_title_1', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500 text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-400 font-bold uppercase block mb-1">{h('title2')}</label>
              <input
                type="text"
                aria-label={h('title2')} value={formState.hero_title_2}
                onChange={(e) => handleChange('hero_title_2', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-blue-400 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-400 font-bold uppercase block mb-1">{h('subtitle')}</label>
              <textarea
                rows={4}
                aria-label={h('subtitle')} value={formState.hero_subtitle}
                onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500 text-xs leading-relaxed"
              />
            </div>

            <div className="pt-2 border-t border-neutral-800 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block">{h('badges')}</span>

              <div>
                <label className="text-[10px] text-neutral-400 block">{h('badge1')}</label>
                <input
                  type="text"
                  aria-label={h('badge1')} value={formState.badge_1}
                  onChange={(e) => handleChange('badge_1', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block">{h('badge2')}</label>
                <input
                  type="text"
                  aria-label={h('badge2')} value={formState.badge_2}
                  onChange={(e) => handleChange('badge_2', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block">{h('badge3')}</label>
                <input
                  type="text"
                  aria-label={h('badge3')} value={formState.badge_3}
                  onChange={(e) => handleChange('badge_3', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2 focus:outline-none text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-3"
            >
              {saveMutation.isPending ? 'Publishing...' : h('saveChanges')}
            </button>
          </div>
        </form>

        {/* Right 7 Cols: Real-Time Interactive Live Preview Canvas */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xs sticky top-24">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-extrabold text-white">{h('preview')}</h3>
            </div>
            <span className="text-[9px] font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase">
              {' '}{h('rendering')}{' '}</span>
          </div>

          {/* Live Preview Container Mocking Homepage */}
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl space-y-4 shadow-inner">
            
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                statusData.open
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusData.open ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {statusData.open ? h('open') : h('closed')}
              </span>

              <span className="text-[9px] font-mono font-bold bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full uppercase">
                {formState.hero_tag || '2D CHARACTER ATELIER'}
              </span>
            </div>

            {/* Live Titles */}
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {formState.hero_title_1} <br />
              <span className="text-blue-400">{formState.hero_title_2}</span>
            </h1>

            {/* Live Subtitle */}
            <p className="text-neutral-400 text-xs leading-relaxed">
              {formState.hero_subtitle}
            </p>

            {/* Live Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex h-8 items-center gap-1 rounded-xl bg-blue-600 text-white font-extrabold text-[10px] px-3">
                <Briefcase className="w-3 h-3" /> {' '}{h('request')}{' '}<ArrowRight className="w-3 h-3" />
              </div>
              <div className="flex h-8 items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 text-white font-bold text-[10px] px-3">
                <LayoutTemplate className="w-3 h-3 text-neutral-400" /> {' '}{h('gallery')}{' '}</div>
            </div>

            {/* Live Badges */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400 pt-3 border-t border-neutral-800">
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3 text-blue-400" /> {formState.badge_1}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3 text-blue-400" /> {formState.badge_2}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle className="w-3 h-3 text-blue-400" /> {formState.badge_3}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
