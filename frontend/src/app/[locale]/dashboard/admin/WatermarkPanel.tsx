'use client';

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

export default function WatermarkPanel() {
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
    if (settings) {
      setWType(settings.type || 'text');
      setWText(settings.text || 'WIP DICE #{order_id}');
      setWPattern(settings.pattern || 'tiled');
      setWRotation(settings.rotation ?? -25);
      setWOpacity(settings.opacity ?? 0.25);
      setWTileDensity(settings.tile_density || 'medium');
      setWAntiAiGrid(settings.include_anti_ai_grid ?? false);
      
      if (settings.image_path) {
        setLogoPreviewUrl(`http://127.0.0.1:8000${settings.image_path}`);
      }
    }
  }, [settings]);

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
      alert('บันทึกการตั้งค่าระบบลายน้ำเรียบร้อยแล้ว!');
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถบันทึกการตั้งค่าระบบลายน้ำได้');
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

  // Calculate repeat arrays for grid preview depending on density
  const gridRowsCount = wTileDensity === 'high' ? 5 : wTileDensity === 'low' ? 3 : 4;
  const gridColsCount = wTileDensity === 'high' ? 4 : wTileDensity === 'low' ? 2 : 3;
  const previewRows = Array.from({ length: gridRowsCount });
  const previewCols = Array.from({ length: gridColsCount });

  return (
    <div className="w-full text-neutral-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Engine v2.0 & Dynamic Tags
            </div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
              <Settings className="w-8 h-8 text-blue-500" /> ระบบตั้งค่าลายน้ำขั้นสูง (Watermark Studio)
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              กำหนดรูปแบบ ตำแหน่ง และระบบป้องกันภาพหลุดสำหรับไฟล์งานร่าง (WIP) และภาพพรีวิวรอชำระเงิน
            </p>
          </div>
        </div>

        {/* Quick Presets Bar (ใช้ง่ายใน 1 คลิก!) */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> ชุดตั้งค่าด่วน (Quick Presets)
            </span>
            <span className="text-[11px] text-neutral-500">คลิกเพื่อปรับการตั้งค่าทั้งหมดอัตโนมัติ</span>
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
                <p className="text-xs font-bold text-neutral-200 group-hover:text-red-400">🛡️ ป้องกันสูงสุด</p>
                <p className="text-[10px] text-neutral-500">Grid หนา + ตาข่าย Anti-AI</p>
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
                <p className="text-xs font-bold text-neutral-200 group-hover:text-blue-400">⚡ WIP มาตรฐาน</p>
                <p className="text-[10px] text-neutral-500">ลายทแยงมุม + เลขออเดอร์</p>
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
                <p className="text-xs font-bold text-neutral-200 group-hover:text-purple-400">🎨 แบรนด์ศิลปิน</p>
                <p className="text-[10px] text-neutral-500">โลโก้/ลายเซ็น มุมขวาล่าง</p>
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
                <p className="text-xs font-bold text-neutral-200 group-hover:text-amber-400">👁️ ตราประทับจาง</p>
                <p className="text-[10px] text-neutral-500">ตราประทับกลางรูปจางๆ</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Settings Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Settings Form Column (7 Cols) */}
          <form onSubmit={handleSave} className="lg:col-span-7 bg-neutral-900/60 border border-neutral-800 p-6 md:p-7 rounded-3xl space-y-6 shadow-2xl">
            
            {/* 1. Watermark Mode (Text / Image / Hybrid) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block flex items-center justify-between">
                <span>1. รูปแบบองค์ประกอบ (Watermark Mode)</span>
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
                  <Type className="w-4 h-4" /> ข้อความ (Text)
                </button>

                <button
                  type="button"
                  onClick={() => setWType('image')}
                  className={`py-3 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    wType === 'image'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> โลโก้ (Logo)
                </button>

                <button
                  type="button"
                  onClick={() => setWType('hybrid')}
                  className={`py-3 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    wType === 'hybrid'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <Layers className="w-4 h-4" /> ผสม (Hybrid)
                </button>
              </div>
            </div>

            {/* Conditionally render Text Field & Tags */}
            {(wType === 'text' || wType === 'hybrid') && (
              <div className="space-y-2.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  ข้อความลายน้ำ (Text Content)
                </label>
                <input
                  type="text"
                  required={wType === 'text'}
                  value={wText}
                  onChange={(e) => setWText(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-blue-500 text-sm font-mono transition-all"
                  placeholder="เช่น WIP DICE #{order_id}"
                />

                {/* Dynamic Tag Chips */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                    คลิกเพื่อแทรกคำย่ออัตโนมัติ (Dynamic Tags):
                  </span>
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
                  ภาพโลโก้/ลายเซ็น (PNG แนะนำสไตล์โปร่งแสง)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-700 hover:border-blue-500/70 rounded-2xl cursor-pointer bg-neutral-900/50 hover:bg-neutral-900 transition-all">
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="w-6 h-6 text-neutral-400 mb-1.5" />
                      <p className="text-xs text-neutral-300 font-medium">อัปโหลดไฟล์ภาพโลโก้ใหม่</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">PNG, JPG, WebP (โปร่งแสง)</p>
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
                2. การจัดวางตำแหน่ง (Layout Pattern)
              </label>

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
                  <Grid className="w-4 h-4" /> กระจายทั่วภาพ (Tiled)
                </button>

                <button
                  type="button"
                  onClick={() => setWPattern('center')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'center'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" /> ตรงกลาง (Center)
                </button>

                <button
                  type="button"
                  onClick={() => setWPattern('corner')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'corner'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CornerDownRight className="w-4 h-4" /> มุมภาพ (Corner)
                </button>

                <button
                  type="button"
                  onClick={() => setWPattern('cross')}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    wPattern === 'cross'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" /> กากบาท (Cross X)
                </button>
              </div>
            </div>

            {/* 3. Sliders & Advanced Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Rotation Slider */}
              <div className="space-y-2 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-300">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-blue-400" /> มุมหมุนภาพ (Rotation)
                  </span>
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
                    <Sliders className="w-3.5 h-3.5 text-blue-400" /> ความโปร่งแสง (Opacity)
                  </span>
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
                  <span>บางจาง (5%)</span>
                  <span className="text-emerald-400">แนะนำ (20%-35%)</span>
                  <span>เข้มจัด (80%)</span>
                </div>
              </div>

            </div>

            {/* Density & Anti-AI Mesh Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Density Options (If Tiled) */}
              <div className="space-y-1.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 block">ความหนาแน่นกะถี่ (Density)</label>
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
                      {d === 'low' ? 'ห่าง' : d === 'medium' ? 'ปานกลาง' : 'ถี่มาก'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-AI Protection Toggle */}
              <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> ตาข่ายกัน AI ลบลายน้ำ
                  </p>
                  <p className="text-[10px] text-neutral-500">ซ้อนทับเส้นตาราง Mesh ป้องกัน AI Inpainting</p>
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
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-xl shadow-blue-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังบันทึกโครงสร้างลายน้ำ...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> บันทึกการตั้งค่าลายน้ำ (Save Configuration)
                </>
              )}
            </button>

          </form>

          {/* Real-time Interactive Studio Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" /> ตัวอย่างผลลัพธ์แบบเรียลไทม์ (Live Studio Preview)
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Interactive Canvas
              </span>
            </div>

            {/* Canvas Preview Container */}
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900 select-none group">
              
              {/* Artwork Background simulation */}
              <div className="w-full h-full bg-gradient-to-br from-neutral-950 via-indigo-950 to-purple-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px]"></div>
                <div className="absolute w-72 h-72 rounded-full bg-purple-600/15 blur-3xl -top-16 -left-16 animate-pulse"></div>
                <div className="absolute w-80 h-80 rounded-full bg-blue-600/15 blur-3xl -bottom-20 -right-20 animate-pulse"></div>

                {/* Mock artwork illustration placeholder */}
                <div className="relative z-10 flex flex-col items-center gap-2 text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-md">
                    <ImageIcon className="w-8 h-8 text-neutral-200" />
                  </div>
                  <p className="text-xs font-bold text-neutral-200">SAMPLE ARTWORK PREVIEW</p>
                  <p className="text-[10px] text-neutral-400 max-w-[200px]">
                    จำลองการวางซ้อนลายน้ำบนชิ้นงานศิลปะตามพารามิเตอร์จริง
                  </p>
                </div>
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
              <div className="absolute top-3 left-3 z-30 bg-black/75 border border-neutral-700/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-neutral-300 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                WIP Watermarked Preview
              </div>

            </div>

            {/* Helper Info Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <Info className="w-4 h-4" /> สรุปการทำงานของระบบลายน้ำ
              </div>
              <ul className="text-[11px] text-neutral-400 space-y-1 list-disc list-inside font-medium">
                <li>ไฟล์ประเภท <strong className="text-white">WIP Draft</strong> จะถูกประมวลผลใส่ลายน้ำนี้อัตโนมัติขณะอัปโหลด</li>
                <li>ภาพส่งมอบงวดสุดท้ายที่ยังชำระเงินไม่ครบ จะซ้อนลายน้ำป้องกันเพิ่มเติม</li>
                <li>เมื่อลูกค้าชำระเงินครบครบทุกงวด ระบบจะปลดล็อกไฟล์จริงที่สะอาดไม่มีลายน้ำทันที</li>
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
        <span className="text-[11px] font-black text-white whitespace-nowrap tracking-wider">
          {displayText}
        </span>
      </div>
    );
  }

  return (
    <span className="text-[11px] md:text-xs font-black text-white whitespace-nowrap bg-black/30 px-2.5 py-1 rounded-md border border-white/30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
      {displayText || 'WIP DICE'}
    </span>
  );
}
