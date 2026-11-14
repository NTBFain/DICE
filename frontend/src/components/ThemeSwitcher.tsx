'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { useTheme, THEMES, LayoutMode } from './ThemeContext';
import { Palette, Check, LayoutGrid, Image as ImageIcon, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export default function ThemeSwitcher() {
  const { 
    theme, 
    setTheme, 
    layoutMode, 
    setLayoutMode, 
    customBgUrl, 
    setCustomBgUrl, 
    bgOpacity, 
    setBgOpacity 
  } = useTheme();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'themes' | 'layout' | 'bg'>('themes');
  const locale = useLocale();
  const c = useTranslations('ThemeSwitcher');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); setOpen(false); triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PRESET_WALLPAPERS = [
    { name: c('presetDefault'), url: '' },
    { name: c('presetGrid'), url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
    { name: c('presetCyber'), url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80' },
    { name: c('presetPaper'), url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80' },
    { name: c('presetStars'), url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
        title={c('title')}
        aria-label={c('title')}
      >
        <Palette className="w-4 h-4 text-blue-400" />
        <span className="hidden sm:inline">{c('studio')}</span>
      </button>

      {open && (
        <div id={panelId} role="region" aria-label={c('title')} className="fixed left-3 right-3 top-16 max-w-sm mx-auto sm:max-w-none sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 text-xs">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveTab('themes')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'themes' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Palette className="w-3 h-3" /> {c('palette')}
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'layout' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3" /> {c('layout')}
              </button>
              <button
                onClick={() => setActiveTab('bg')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'bg' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ImageIcon className="w-3 h-3" /> {c('background')}
              </button>
            </div>

            <button 
              aria-label={c('close')}
              onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: 15 Color Themes */}
          {activeTab === 'themes' && (
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 no-scrollbar">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 mb-1.5 flex justify-between">
                <span>{c('palettes')}</span>
              </div>
              {THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    aria-pressed={isSelected}
                    onClick={() => setTheme(t.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                          style={{ backgroundColor: t.previewBg }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                          style={{ backgroundColor: t.previewAccent }}
                        />
                      </div>
                      <span className="truncate">{locale === 'th' ? t.nameTh : t.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {t.isLight && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {c('light')}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: Layout Modes */}
          {activeTab === 'layout' && (
            <div className="space-y-3 p-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                {c('layoutHeading')}
              </div>
              <div className="space-y-2">
                {[
                  { id: 'grid', label: c('grid'), desc: c('gridDescription') },
                  { id: 'masonry', label: c('masonry'), desc: c('masonryDescription') },
                  { id: 'compact', label: c('compact'), desc: c('compactDescription') },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    aria-pressed={layoutMode === mode.id}
                    onClick={() => setLayoutMode(mode.id as LayoutMode)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      layoutMode === mode.id
                        ? 'bg-blue-600 text-white font-bold border-blue-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{mode.label}</span>
                      {layoutMode === mode.id && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Artist Custom Background Wallpaper */}
          {activeTab === 'bg' && (
            <div className="space-y-3 p-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                {c('backgroundHeading')}
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 block">{c('presets')}</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRESET_WALLPAPERS.map((preset, idx) => (
                    <button
                      key={idx}
                      aria-pressed={customBgUrl === preset.url}
                      onClick={() => setCustomBgUrl(preset.url)}
                      className={`p-2 rounded-lg text-left text-[11px] border transition-all cursor-pointer flex items-center justify-between ${
                        customBgUrl === preset.url
                          ? 'bg-blue-600 text-white font-bold border-blue-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <span>{preset.name}</span>
                      {customBgUrl === preset.url && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL Input */}
              <div className="pt-2 border-t border-neutral-800">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  {c('customUrl')}
                </label>
                <input
                  type="url"
                  aria-label={c('customUrl')}
                  placeholder="https://example.com/artist-wallpaper.jpg"
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg p-2 text-[11px] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Opacity Slider */}
              {customBgUrl && (
                <div className="pt-2 border-t border-neutral-800 space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                    <span>{c('opacity')}</span>
                    <span>{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label={c('opacity')}
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
