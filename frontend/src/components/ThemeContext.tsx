'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 
  | 'obsidian' 
  | 'cyberpunk' 
  | 'canvas' 
  | 'emerald' 
  | 'nordic' 
  | 'sakura' 
  | 'sunset' 
  | 'coffee' 
  | 'dracula' 
  | 'ocean' 
  | 'monochrome' 
  | 'matcha' 
  | 'retro' 
  | 'paper' 
  | 'rose';

export type LayoutMode = 'grid' | 'masonry' | 'compact';

export interface ThemeOption {
  id: ThemeId | string;
  name: string;
  nameTh: string;
  isLight?: boolean;
  previewBg: string;
  previewAccent: string;
  isCustom?: boolean;
  accentPrimary?: string;
  accentHover?: string;
  bgPrimary?: string;
  bgSurface?: string;
  borderSubtle?: string;
  borderHover?: string;
  textPrimary?: string;
  textMuted?: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Studio',
    nameTh: 'โอเบซิเดียน สตูติโอ',
    previewBg: '#09090b',
    previewAccent: '#3b82f6',
    accentPrimary: '#3b82f6',
    bgPrimary: '#09090b',
    bgSurface: '#121215',
    textPrimary: '#f4f4f5',
    textMuted: '#a1a1aa'
  },
  {
    id: 'cyberpunk',
    name: 'Neo-Tokyo Neon',
    nameTh: 'นีโอ-โตเกียว ไซเบอร์',
    previewBg: '#0b0f19',
    previewAccent: '#ec4899',
    accentPrimary: '#ec4899',
    bgPrimary: '#0b0f19',
    bgSurface: '#111827',
    textPrimary: '#f9fafb',
    textMuted: '#9ca3af'
  },
  {
    id: 'canvas',
    name: 'Editorial Canvas',
    nameTh: 'แคนวาส คลาสสิก',
    isLight: true,
    previewBg: '#fcfbf7',
    previewAccent: '#c2410c',
    accentPrimary: '#c85a32',
    bgPrimary: '#faf7f2',
    bgSurface: '#ffffff',
    textPrimary: '#2c2623',
    textMuted: '#6e655f'
  },
  {
    id: 'emerald',
    name: 'Emerald Atelier',
    nameTh: 'เอ็มเมอรัลด์ สตูติโอ',
    previewBg: '#04120c',
    previewAccent: '#10b981',
    accentPrimary: '#10b981',
    bgPrimary: '#04120c',
    bgSurface: '#0a2016',
    textPrimary: '#f0fdf4',
    textMuted: '#86efac'
  },
  {
    id: 'nordic',
    name: 'Nordic Ice Slate',
    nameTh: 'นอร์ดิก ไอซ์ สเลท',
    previewBg: '#0f172a',
    previewAccent: '#38bdf8',
    accentPrimary: '#38bdf8',
    bgPrimary: '#0f172a',
    bgSurface: '#1e293b',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8'
  },
  {
    id: 'sakura',
    name: 'Sakura Moonlight',
    nameTh: 'ซากุระ มูนไลท์',
    previewBg: '#130912',
    previewAccent: '#f472b6',
    accentPrimary: '#f472b6',
    bgPrimary: '#130912',
    bgSurface: '#1f0f1d',
    textPrimary: '#fdf2f8',
    textMuted: '#f472b6'
  },
  {
    id: 'sunset',
    name: 'Cyber Sunset',
    nameTh: 'ไซเบอร์ ซันเซ็ต',
    previewBg: '#110a1f',
    previewAccent: '#f97316',
    accentPrimary: '#f97316',
    bgPrimary: '#110a1f',
    bgSurface: '#1c1130',
    textPrimary: '#faf5ff',
    textMuted: '#c084fc'
  },
  {
    id: 'coffee',
    name: 'Warm Espresso',
    nameTh: 'เอสเพรสโซ อุ่น',
    previewBg: '#18110c',
    previewAccent: '#d97706',
    accentPrimary: '#d97706',
    bgPrimary: '#18110c',
    bgSurface: '#261b14',
    textPrimary: '#fef3c7',
    textMuted: '#d97706'
  },
  {
    id: 'dracula',
    name: 'Midnight Violet',
    nameTh: 'มิดไนท์ ไวโอเล็ต',
    previewBg: '#0d0b14',
    previewAccent: '#9333ea',
    accentPrimary: '#9333ea',
    bgPrimary: '#0d0b14',
    bgSurface: '#171324',
    textPrimary: '#f3e8ff',
    textMuted: '#c084fc'
  },
  {
    id: 'ocean',
    name: 'Abyssal Ocean',
    nameTh: 'แอไบสซอล โอเชียน',
    previewBg: '#04131a',
    previewAccent: '#14b8a6',
    accentPrimary: '#14b8a6',
    bgPrimary: '#04131a',
    bgSurface: '#0a212c',
    textPrimary: '#f0fdfa',
    textMuted: '#2dd4bf'
  },
  {
    id: 'monochrome',
    name: 'Noir Monochrome',
    nameTh: 'นัวร์ โมโนโครม',
    previewBg: '#050505',
    previewAccent: '#e4e4e7',
    accentPrimary: '#e4e4e7',
    bgPrimary: '#050505',
    bgSurface: '#121212',
    textPrimary: '#ffffff',
    textMuted: '#a3a3a3'
  },
  {
    id: 'matcha',
    name: 'Kyoto Matcha',
    nameTh: 'เกียวโต มัทฉะ',
    previewBg: '#0d170d',
    previewAccent: '#84cc16',
    accentPrimary: '#84cc16',
    bgPrimary: '#0d170d',
    bgSurface: '#152415',
    textPrimary: '#f7fee7',
    textMuted: '#a3e635'
  },
  {
    id: 'retro',
    name: '80s Arcade Neon',
    nameTh: 'อาเคด 80s',
    previewBg: '#14131a',
    previewAccent: '#facc15',
    accentPrimary: '#facc15',
    bgPrimary: '#14131a',
    bgSurface: '#1e1d26',
    textPrimary: '#fef08a',
    textMuted: '#facc15'
  },
  {
    id: 'paper',
    name: 'Blueprint Draft',
    nameTh: 'บลูพริ้นต์ ดราฟต์',
    isLight: true,
    previewBg: '#f1f5f9',
    previewAccent: '#1e40af',
    accentPrimary: '#1e40af',
    bgPrimary: '#f1f5f9',
    bgSurface: '#e2e8f0',
    textPrimary: '#0f172a',
    textMuted: '#334155'
  },
  {
    id: 'rose',
    name: 'Rose Quartz Light',
    nameTh: 'โรสควอตซ์ สว่าง',
    isLight: true,
    previewBg: '#fff1f2',
    previewAccent: '#e11d48',
    accentPrimary: '#e11d48',
    bgPrimary: '#fff1f2',
    bgSurface: '#ffe4e6',
    textPrimary: '#4c0519',
    textMuted: '#881337'
  },
];

interface ThemeContextType {
  theme: string;
  setTheme: (themeId: string) => void;
  customThemes: ThemeOption[];
  addCustomTheme: (customTheme: ThemeOption) => void;
  deleteCustomTheme: (themeId: string) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  customBgUrl: string;
  setCustomBgUrl: (url: string) => void;
  bgOpacity: number;
  setBgOpacity: (opacity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>('obsidian');
  const [customThemes, setCustomThemes] = useState<ThemeOption[]>([]);
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>('grid');
  const [customBgUrl, setCustomBgUrlState] = useState<string>('');
  const [bgOpacity, setBgOpacityState] = useState<number>(0.25);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-wallpaper', !!customBgUrl);
    return () => document.documentElement.removeAttribute('data-wallpaper');
  }, [customBgUrl]);

  const applyThemeToDOM = (activeThemeId: string, customList: ThemeOption[] = customThemes) => {
    const customMatch = customList.find((t) => t.id === activeThemeId);
    let isLight = false;

    if (customMatch && customMatch.isCustom) {
      document.documentElement.setAttribute('data-theme', 'custom');
      document.body.setAttribute('data-theme', 'custom');
      
      document.documentElement.style.setProperty('--bg-primary', customMatch.bgPrimary || '#09090b');
      document.documentElement.style.setProperty('--bg-surface', customMatch.bgSurface || '#121215');
      document.documentElement.style.setProperty('--bg-surface-hover', customMatch.bgSurface || '#1c1c21');
      document.documentElement.style.setProperty('--border-subtle', customMatch.borderSubtle || '#27272a');
      document.documentElement.style.setProperty('--border-hover', customMatch.borderHover || '#3f3f46');
      document.documentElement.style.setProperty('--text-primary', customMatch.textPrimary || '#f4f4f5');
      document.documentElement.style.setProperty('--text-muted', customMatch.textMuted || '#a1a1aa');
      document.documentElement.style.setProperty('--accent-primary', customMatch.accentPrimary || '#3b82f6');
      document.documentElement.style.setProperty('--accent-hover', customMatch.accentHover || customMatch.accentPrimary || '#2563eb');

      // Helper function to detect lightness from hex
      const hex = customMatch.bgPrimary || '#09090b';
      if (hex.startsWith('#') && hex.length >= 7) {
        const r = parseInt(hex.substring(1, 3), 16) || 0;
        const g = parseInt(hex.substring(3, 5), 16) || 0;
        const b = parseInt(hex.substring(5, 7), 16) || 0;
        isLight = (r * 299 + g * 587 + b * 114) / 1000 > 140;
      }
    } else {
      document.documentElement.removeAttribute('style');
      document.body.removeAttribute('style');
      const validBuiltin = THEMES.some((t) => t.id === activeThemeId) ? activeThemeId : 'obsidian';
      document.documentElement.setAttribute('data-theme', validBuiltin);
      document.body.setAttribute('data-theme', validBuiltin);

      const targetTheme = THEMES.find((t) => t.id === validBuiltin);
      isLight = !!targetTheme?.isLight;
    }

    if (isLight) {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  };

  useEffect(() => {
    let savedCustom: ThemeOption[] = [];
    try {
      const rawCustom = localStorage.getItem('dice_custom_themes');
      if (rawCustom) {
        savedCustom = JSON.parse(rawCustom);
        setCustomThemes(savedCustom);
      }
    } catch (e) {
      console.error('Failed to load custom themes', e);
    }

    const savedTheme = localStorage.getItem('dice_theme') || 'obsidian';
    const savedLayout = localStorage.getItem('dice_layout') as LayoutMode;
    const savedBg = localStorage.getItem('dice_bg_url');
    const savedOpacity = localStorage.getItem('dice_bg_opacity');

    const timer = setTimeout(() => {
      setThemeState(savedTheme);
      applyThemeToDOM(savedTheme, savedCustom);

      if (savedLayout) setLayoutModeState(savedLayout);
      if (savedBg) setCustomBgUrlState(savedBg);
      if (savedOpacity) setBgOpacityState(parseFloat(savedOpacity));
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const setTheme = (newThemeId: string) => {
    setThemeState(newThemeId);
    localStorage.setItem('dice_theme', newThemeId);
    applyThemeToDOM(newThemeId, customThemes);
  };

  const addCustomTheme = (newCustomTheme: ThemeOption) => {
    const updated = [...customThemes.filter((t) => t.id !== newCustomTheme.id), newCustomTheme];
    setCustomThemes(updated);
    localStorage.setItem('dice_custom_themes', JSON.stringify(updated));
    setThemeState(newCustomTheme.id);
    localStorage.setItem('dice_theme', newCustomTheme.id);
    applyThemeToDOM(newCustomTheme.id, updated);
  };

  const deleteCustomTheme = (themeId: string) => {
    const updated = customThemes.filter((t) => t.id !== themeId);
    setCustomThemes(updated);
    localStorage.setItem('dice_custom_themes', JSON.stringify(updated));
    if (theme === themeId) {
      setTheme('obsidian');
    }
  };

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem('dice_layout', mode);
  };

  const setCustomBgUrl = (url: string) => {
    setCustomBgUrlState(url);
    localStorage.setItem('dice_bg_url', url);
  };

  const setBgOpacity = (opacity: number) => {
    setBgOpacityState(opacity);
    localStorage.setItem('dice_bg_opacity', opacity.toString());
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        customThemes,
        addCustomTheme,
        deleteCustomTheme,
        layoutMode, 
        setLayoutMode, 
        customBgUrl, 
        setCustomBgUrl, 
        bgOpacity, 
        setBgOpacity 
      }}
    >
      {/* Dynamic Artist Custom Background Layer */}
      {customBgUrl && (
        <div 
          aria-hidden="true"
          className="fixed inset-0 z-[-1] pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{ 
            backgroundImage: `url(${customBgUrl})`,
            opacity: bgOpacity
          }}
        />
      )}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
