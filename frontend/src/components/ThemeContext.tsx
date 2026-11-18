'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { resolveTheme, themeVariables, isLightTheme, type ThemeOption } from '@/lib/themePalettes';
export { THEMES } from '@/lib/themePalettes';
export type { ThemeId, ThemeOption } from '@/lib/themePalettes';
export type LayoutMode = 'grid' | 'masonry' | 'compact';

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
    const selected = resolveTheme(activeThemeId, customList);
    const isLight = isLightTheme(selected);
    // Complete token sets avoid stale colors when switching between built-in and custom themes.
    for (const element of [document.documentElement, document.body]) {
      element.setAttribute('data-theme', selected.isCustom ? 'custom' : selected.id);
    }
    for (const [name, value] of Object.entries(themeVariables(selected))) {
      document.documentElement.style.setProperty(name, value);
    }
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';

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
