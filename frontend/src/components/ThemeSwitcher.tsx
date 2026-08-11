'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, LayoutMode } from './ThemeContext';
import { Palette, Check, LayoutGrid, Image as ImageIcon, X } from 'lucide-react';
import { useLocale } from 'next-intl';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { name: 'None (Default)', url: '' },
    { name: 'Dark Grid Mesh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Abstract Cyberwave', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Warm Parchment Texture', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Deep Nebula Stars', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
        title="Customize Theme & Layout"
        aria-label="Customize Theme & Layout"
      >
        <Palette className="w-4 h-4 text-blue-400" />
        <span className="hidden sm:inline">Studio Theme</span>
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-16 max-w-sm mx-auto sm:max-w-none sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 text-xs">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveTab('themes')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'themes' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Palette className="w-3 h-3" /> Palette
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'layout' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3" /> Layout
              </button>
              <button
                onClick={() => setActiveTab('bg')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'bg' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ImageIcon className="w-3 h-3" /> BG
              </button>
            </div>

            <button 
              onClick={() => setOpen(false)}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: 15 Color Themes */}
          {activeTab === 'themes' && (
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 no-scrollbar">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 mb-1.5 flex justify-between">
                <span>{locale === 'th' ? 'เลือกธีมสีประจำเว็บ' : '15 Color Palettes'}</span>
              </div>
              {THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
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
                          Light
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
                Select Showcase Layout Mode
              </div>
              <div className="space-y-2">
                {[
                  { id: 'grid', label: 'Studio Standard Grid', desc: 'Balanced 3-column structured layout.' },
                  { id: 'masonry', label: 'Editorial Masonry Flow', desc: 'Asymmetric Pinterest/ArtStation style.' },
                  { id: 'compact', label: 'Compact Showcase Strip', desc: 'Dense horizontal list for fast browsing.' },
                ].map((mode) => (
                  <button
                    key={mode.id}
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
                Artist Custom Background Image
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 block">Presets:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRESET_WALLPAPERS.map((preset, idx) => (
                    <button
                      key={idx}
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
                  Or Paste Custom Image URL:
                </label>
                <input
                  type="url"
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
                    <span>Wallpaper Opacity:</span>
                    <span>{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
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
