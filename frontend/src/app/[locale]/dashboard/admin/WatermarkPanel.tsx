'use client';

import { useTranslations } from 'next-intl';

import { useLocale } from 'next-intl';
import { getErrorMessage } from '@/lib/errorMessage';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import { 
  Loader2, 
  Upload, 
  Settings, 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  ShieldCheck, 
  Grid, 
  Maximize2, 
  RotateCw, 
  Sliders, 
  Lock, 
  Layers, 
  Check, 
  Info,
  CornerDownRight,
  Plus
} from 'lucide-react';

export default function WatermarkPanel({ readOnly = false }: { readOnly?: boolean }) {
  const studio = useTranslations('Studio');
  const locale = useLocale();
  const [tryingPreview, setTryingPreview] = useState(false);
  const showControls = !readOnly || tryingPreview;
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const { apiClient } = useAuth();
  const queryClient = useQueryClient();

  const [wType, setWType] = useState<'text' | 'image' | 'hybrid'>('text');
  const [wText, setWText] = useState('WIP DICE #{order_id}');
  const [wPattern, setWPattern] = useState<'tiled' | 'center' | 'corner' | 'cross'>('tiled');
  const [wRotation, setWRotation] = useState<number>(-25);
  const [wOpacity, setWOpacity] = useState<number>(0.25);
  const [wTileDensity, setWTileDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [wAntiAiGrid, setWAntiAiGrid] = useState<boolean>(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Fetch current watermark settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['watermark-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/commissions/watermark');
      return res.data;
    },
  });

  // Load fetched settings into state
  useEffect(() => {
    if (settings && !(readOnly && tryingPreview)) {
      setWType(settings.type || 'text');
      setWText(settings.text || 'WIP DICE #{order_id}');
      setWPattern(settings.pattern || 'tiled');
      setWRotation(settings.rotation ?? -25);
      setWOpacity(settings.opacity ?? 0.25);
      setWTileDensity(settings.tile_density || 'medium');
      setWAntiAiGrid(settings.include_anti_ai_grid ?? false);
      
      setLogoFile(null);
      const path = settings.image_path;
      setLogoPreviewUrl(path && !path.startsWith('http') && !path.startsWith('/') ? `/${path}` : path || '');
    }
  }, [settings, readOnly, tryingPreview]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreviewUrl(url);
    }
  };

  const insertTag = (tag: string) => {
    setWText((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  // Presets Quick Actions
  const applyPreset = (presetName: 'security' | 'wip' | 'branding' | 'subtle') => {
    if (presetName === 'security') {
      setWType('text');
      setWText('CONFIDENTIAL #{order_id} - {client}');
      setWPattern('tiled');
      setWRotation(-45);
      setWOpacity(0.35);
      setWTileDensity('high');
      setWAntiAiGrid(true);
    } else if (presetName === 'wip') {
      setWType('text');
      setWText('WIP DICE #{order_id}');
      setWPattern('tiled');
      setWRotation(-25);
      setWOpacity(0.25);
      setWTileDensity('medium');
      setWAntiAiGrid(false);
    } else if (presetName === 'branding') {
      setWType(logoPreviewUrl ? 'hybrid' : 'text');
      setWText('CREATED BY {artist}');
      setWPattern('corner');
      setWRotation(0);
      setWOpacity(0.50);
      setWTileDensity('medium');
      setWAntiAiGrid(false);
    } else if (presetName === 'subtle') {
      setWType('text');
      setWText('PROOFS ONLY');
      setWPattern('center');
      setWRotation(0);
      setWOpacity(0.15);
      setWTileDensity('low');
      setWAntiAiGrid(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || saving) return;
    setNotice(''); setSaveError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('type', wType);
      formData.append('text', wText);
      formData.append('pattern', wPattern);
      formData.append('rotation', wRotation.toString());
      formData.append('opacity', wOpacity.toString());
      formData.append('tile_density', wTileDensity);
      formData.append('include_anti_ai_grid', wAntiAiGrid ? 'true' : 'false');
      
      if (logoFile) {
        formData.append('image', logoFile);
      }

      await apiClient.post('/commissions/watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['watermark-settings'] });
      setNotice(locale === 'th' ? studio('watermark_156_0') : 'Watermark settings saved.');
    } catch (err) {
      console.error(err);
      setSaveError(getErrorMessage(err, locale === 'th' ? studio('watermark_159_0') : 'Unable to save watermark settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!settings) {
    return <p role="alert">{studio('watermarkLoadError')}</p>;
  }

  // Calculate repeat arrays for grid preview depending on density
  const gridRowsCount = wTileDensity === 'high' ? 5 : wTileDensity === 'low' ? 3 : 4;
  const gridColsCount = wTileDensity === 'high' ? 4 : wTileDensity === 'low' ? 2 : 3;
  const previewRows = Array.from({ length: gridRowsCount });
  const previewCols = Array.from({ length: gridColsCount });

  return (
    <div className="w-full text-neutral-100">
      {notice && <p role="status" className="mb-4 text-emerald-300">{notice}</p>}
      {saveError && <p role="alert" className="mb-4 text-red-300">{saveError}</p>}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Engine v2.0 & Dynamic Tags
            </div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
              <Settings className="w-8 h-8 text-blue-500" /> {' '}{studio(readOnly ? 'watermarkActiveTitle' : 'watermark_193_0')}{' '}</h1>
            <p className="text-neutral-400 text-sm mt-1">
              {' '}{studio(readOnly ? (tryingPreview ? 'watermarkPreviewOnly' : 'watermarkManaged') : 'watermark_196_0')}{' '}</p>
          </div>
          {readOnly && <button type="button" aria-expanded={tryingPreview}
            onClick={() => setTryingPreview(value => !value)}
            className="studio-primary shrink-0 rounded-xl px-4 py-2 text-sm font-semibold">
            {studio(tryingPreview ? 'watermarkExitPreview' : 'watermarkTryPreview')}
          </button>}
        </div>

        {/* Quick Presets Bar (ใช้ง่ายใน 1 คลิก!) */}
        {showControls && <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> {' '}{studio('watermark_205_0')}{' '}</span>
            <span className="text-[11px] text-neutral-500">{studio('watermark_207_0')}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => applyPreset('security')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-200 group-hover:text-red-400">{studio('watermark_220_0')}</p>
                <p className="text-[10px] text-neutral-500">{studio('watermark_221_0')}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('wip')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-200 group-hover:text-blue-400">{studio('watermark_234_0')}</p>
                <p className="text-[10px] text-neutral-500">{studio('watermark_235_0')}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('branding')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <CornerDownRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-200 group-hover:text-purple-400">{studio('watermark_248_0')}</p>
                <p className="text-[10px] text-neutral-500">{studio('watermark_249_0')}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('subtle')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-200 group-hover:text-amber-400">{studio('watermark_262_0')}</p>
                <p className="text-[10px] text-neutral-500">{studio('watermark_263_0')}</p>
              </div>
            </button>
          </div>
        </div>}

        {/* Main Settings Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-16">
          
          {/* Settings Form Column (7 Cols) */}
          {showControls && <form onSubmit={handleSave} className="lg:col-span-7 bg-neutral-900/60 border border-neutral-800 p-6 md:p-7 rounded-3xl space-y-6 shadow-2xl">
            
            {/* 1. Watermark Mode (Text / Image / Hybrid) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block flex items-center justify-between">
                <span>{studio('watermark_278_0')}</span>
                <span className="text-[11px] text-blue-400 capitalize">{wType} Mode</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setWType('text')}
                  className={`py-3 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    wType === 'text'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <Type className="w-4 h-4" /> {' '}{studio('watermark_292_0')}{' '}</button>

                <button
                  type="button"
                  onClick={() => setWType('image')}
                  className={`py-3 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    wType === 'image'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> {' '}{studio('watermark_304_0')}{' '}</button>

                <button
                  type="button"
                  onClick={() => setWType('hybrid')}
                  className={`py-3 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    wType === 'hybrid'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <Layers className="w-4 h-4" /> {' '}{studio('watermark_316_0')}{' '}</button>
              </div>
            </div>

            {/* Conditionally render Text Field & Tags */}
            {(wType === 'text' || wType === 'hybrid') && (
              <div className="space-y-2.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  {' '}{studio('watermark_325_0')}{' '}</label>
                <input
                  type="text"
                  required={wType === 'text'}
                  value={wText}
                  onChange={(e) => setWText(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-blue-500 text-sm font-mono transition-all"
                  placeholder={studio('watermark_333_0')}
                />

                {/* Dynamic Tag Chips */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                    {' '}{studio('watermark_339_0')}{' '}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertTag('{order_id}')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-blue-900/40 border border-neutral-700 hover:border-blue-500/50 text-[11px] font-mono text-neutral-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-400" /> &#123;order_id&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('{client}')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-blue-900/40 border border-neutral-700 hover:border-blue-500/50 text-[11px] font-mono text-neutral-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-400" /> &#123;client&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('{artist}')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-blue-900/40 border border-neutral-700 hover:border-blue-500/50 text-[11px] font-mono text-neutral-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-400" /> &#123;artist&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('{date}')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-blue-900/40 border border-neutral-700 hover:border-blue-500/50 text-[11px] font-mono text-neutral-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-400" /> &#123;date&#125;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally render Logo Upload */}
            {(wType === 'image' || wType === 'hybrid') && (
              <div className="space-y-2.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  {' '}{studio('watermark_379_0')}{' '}</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-700 hover:border-blue-500/70 rounded-2xl cursor-pointer bg-neutral-900/50 hover:bg-neutral-900 transition-all">
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="w-6 h-6 text-neutral-400 mb-1.5" />
                      <p className="text-xs text-neutral-300 font-medium">{studio('watermark_385_0')}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{studio('watermark_386_0')}</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 2. Watermark Layout Pattern */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block">
                {' '}{studio('watermark_402_0')}{' '}</label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setWPattern('tiled')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'tiled'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" /> {' '}{studio('watermark_415_0')}{' '}</button>

                <button
                  type="button"
                  onClick={() => setWPattern('center')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'center'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" /> {' '}{studio('watermark_427_0')}{' '}</button>

                <button
                  type="button"
                  onClick={() => setWPattern('corner')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'corner'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CornerDownRight className="w-4 h-4" /> {' '}{studio('watermark_439_0')}{' '}</button>

                <button
                  type="button"
                  onClick={() => setWPattern('cross')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'cross'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" /> {' '}{studio('watermark_451_0')}{' '}</button>
              </div>
            </div>

            {/* 3. Sliders & Advanced Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Rotation Slider */}
              <div className="space-y-2 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-300">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-blue-400" /> {' '}{studio('watermark_463_0')}{' '}</span>
                  <span className="text-blue-400 font-mono font-bold">{wRotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={wRotation}
                  onChange={(e) => setWRotation(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                <div className="flex justify-between gap-1 pt-1">
                  {[-45, -25, 0, 45].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setWRotation(deg)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        wRotation === deg ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-300">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" /> {' '}{studio('watermark_496_0')}{' '}</span>
                  <span className="text-blue-400 font-mono font-bold">{Math.round(wOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={wOpacity}
                  onChange={(e) => setWOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>{studio('watermark_510_0')}</span>
                  <span className="text-emerald-400">{studio('watermark_511_0')}</span>
                  <span>{studio('watermark_512_0')}</span>
                </div>
              </div>

            </div>

            {/* Density & Anti-AI Mesh Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Density Options (If Tiled) */}
              <div className="space-y-1.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 block">{studio('watermark_523_0')}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['low', 'medium', 'high'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWTileDensity(d)}
                      className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        wTileDensity === d
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {d === 'low' ? studio('watermark_536_1') : d === 'medium' ? studio('watermark_536_2') : studio('watermark_536_3')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-AI Protection Toggle */}
              <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> {' '}{studio('watermark_546_0')}{' '}</p>
                  <p className="text-[10px] text-neutral-500">{studio('watermark_548_0')}</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wAntiAiGrid}
                    onChange={(e) => setWAntiAiGrid(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

            </div>

            {/* Save Action Button */}
            {!readOnly && <button
              type="submit"
              disabled={saving || readOnly}
              className="studio-primary flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {' '}{studio('watermark_573_0')}{' '}</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> {' '}{studio('watermark_577_0')}{' '}</>
              )}
            </button>}

          </form>}

          {/* Real-time Interactive Studio Preview (5 Cols) */}
          <div className={`min-w-0 space-y-4 self-start ${showControls ? "lg:col-span-5" : "lg:col-span-8 lg:col-start-3"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" /> {' '}{studio('watermark_588_0')}{' '}</h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {studio(readOnly && !tryingPreview ? 'watermarkSavedSettings' : 'watermarkSamplePreview')}
              </span>
            </div>

            {/* Canvas Preview Container */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] select-none">
              
              <div aria-hidden="true" className="absolute inset-0 bg-[#263449]">
                <div className="absolute -left-[12%] top-[18%] size-[72%] rounded-full bg-[#536c80]" />
                <div className="absolute -bottom-[40%] right-[-12%] size-[95%] rounded-full bg-[#936b65]" />
                <div className="absolute inset-0 bg-[#182438]/30" />
              </div>

              {/* Anti-AI Protection Overlay Layer */}
              {wAntiAiGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(45deg,#ffffff0f_25%,transparent_25%,transparent_50%,#ffffff0f_50%,#ffffff0f_75%,transparent_75%,transparent)] bg-[size:30px_30px]"
                  style={{ opacity: Math.max(0.1, wOpacity * 0.5) }}
                ></div>
              )}

              {/* Dynamic Watermark Stamp Overlay Layer */}
              <div 
                className={`absolute inset-0 pointer-events-none z-20 overflow-hidden ${
                  wPattern === 'center'
                    ? 'flex items-center justify-center'
                    : wPattern === 'corner'
                    ? 'flex items-end justify-end p-6'
                    : wPattern === 'cross'
                    ? 'flex items-center justify-center'
                    : 'grid p-4'
                }`}
                style={{
                  gridTemplateRows: wPattern === 'tiled' ? `repeat(${gridRowsCount}, minmax(0, 1fr))` : undefined,
                  gridTemplateColumns: wPattern === 'tiled' ? `repeat(${gridColsCount}, minmax(0, 1fr))` : undefined,
                  opacity: wOpacity,
                }}
              >
                {/* Diagonal Cross lines if Cross pattern selected */}
                {wPattern === 'cross' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[150%] h-0.5 bg-white/40 rotate-45 transform"></div>
                    <div className="w-[150%] h-0.5 bg-white/40 -rotate-45 transform"></div>
                  </div>
                )}

                {/* Render Stamps */}
                {(wPattern === 'center' || wPattern === 'corner' || wPattern === 'cross') ? (
                  <div 
                    className="transform transition-transform"
                    style={{ transform: `rotate(${wRotation}deg)` }}
                  >
                    {renderStampContent(wType, wText, logoPreviewUrl)}
                  </div>
                ) : (
                  previewRows.map((_, rIdx) => 
                    previewCols.map((_, cIdx) => (
                      <div 
                        key={`${rIdx}-${cIdx}`} 
                        className="flex items-center justify-center transform transition-transform"
                        style={{ transform: `rotate(${wRotation}deg)` }}
                      >
                        {renderStampContent(wType, wText, logoPreviewUrl)}
                      </div>
                    ))
                  )
                )}

              </div>

              {/* Status Header Badge */}
              <div className="absolute top-3 left-3 z-30 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-1 rounded-full text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
                {studio('watermarkSamplePreview')}
              </div>

            </div>

            {/* Helper Info Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <Info className="w-4 h-4" /> {' '}{studio('watermark_684_0')}{' '}</div>
              <ul className="text-[11px] text-neutral-400 space-y-1 list-disc list-inside font-medium">
                <li>{studio('watermark_687_1')}{' '}<strong className="text-white">WIP Draft</strong> {' '}{studio('watermark_687_2')}</li>
                <li>{studio('watermark_688_0')}</li>
                <li>{studio('watermark_689_0')}</li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function renderStampContent(type: 'text' | 'image' | 'hybrid', text: string, logoUrl: string) {
  const displayText = text.replace('{order_id}', '1024').replace('{client}', 'John').replace('{artist}', 'Alice').replace('{date}', '2026-07-23');

  if (type === 'image' && logoUrl) {
    return <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain drop-shadow" />;
  }

  if (type === 'hybrid') {
    return (
      <div className="flex flex-col items-center gap-1 bg-black/20 p-1.5 rounded-lg border border-white/20 backdrop-blur-[1px]">
        {logoUrl && <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />}
        <span className="text-[11px] font-semibold text-[#fff] whitespace-nowrap tracking-wide">
          {displayText}
        </span>
      </div>
    );
  }

  return (
    <span className="text-[10px] md:text-xs font-semibold text-[#fff] whitespace-nowrap tracking-wide drop-shadow-sm">
      {displayText || 'WIP DICE'}
    </span>
  );
}
