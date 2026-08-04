'use client';

import { useState } from 'react';
import { useTheme, THEMES, ThemeOption } from '@/components/ThemeContext';
import { 
  Palette, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Copy, 
  Sliders, 
  Eye, 
  Briefcase, 
  Layers, 
  ShieldCheck, 
  Layout, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function ThemeStudioPage() {
  const { theme, setTheme, customThemes, addCustomTheme, deleteCustomTheme } = useTheme();

  // Custom Theme Form State
  const [customName, setCustomName] = useState('My Custom Studio');
  const [customNameTh, setCustomNameTh] = useState('ธีมส่วนตัวของฉัน');
  const [accentPrimary, setAccentPrimary] = useState('#ec4899');
  const [accentHover, setAccentHover] = useState('#db2777');
  const [bgPrimary, setBgPrimary] = useState('#0b0f19');
  const [bgSurface, setBgSurface] = useState('#111827');
  const [borderSubtle, setBorderSubtle] = useState('#374151');
  const [borderHover, setBorderHover] = useState('#4b5563');
  const [textPrimary, setTextPrimary] = useState('#f9fafb');
  const [textMuted, setTextMuted] = useState('#9ca3af');

  const [activeTab, setActiveTab] = useState<'gallery' | 'creator'>('gallery');

  const handleSaveCustomTheme = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom_${Date.now()}`;
    const newTheme: ThemeOption = {
      id,
      name: customName,
      nameTh: customNameTh,
      isCustom: true,
      previewBg: bgPrimary,
      previewAccent: accentPrimary,
      accentPrimary,
      accentHover,
      bgPrimary,
      bgSurface,
      borderSubtle,
      borderHover,
      textPrimary,
      textMuted
    };

    addCustomTheme(newTheme);
    alert('บันทึกและใช้ธีมใหม่เรียบร้อยแล้ว!');
  };

  const applyColorPreset = (preset: 'neon' | 'gold' | 'emerald' | 'cyan' | 'purple') => {
    if (preset === 'neon') {
      setCustomName('Cyber Neon');
      setCustomNameTh('ไซเบอร์ นีออน');
      setAccentPrimary('#ec4899');
      setAccentHover('#db2777');
      setBgPrimary('#0b0f19');
      setBgSurface('#111827');
      setBorderSubtle('#374151');
      setBorderHover('#4b5563');
      setTextPrimary('#f9fafb');
      setTextMuted('#9ca3af');
    } else if (preset === 'gold') {
      setCustomName('Imperial Gold');
      setCustomNameTh('ทองคำ อิมพีเรียล');
      setAccentPrimary('#eab308');
      setAccentHover('#ca8a04');
      setBgPrimary('#0c0a09');
      setBgSurface('#1c1917');
      setBorderSubtle('#292524');
      setBorderHover('#44403c');
      setTextPrimary('#fef08a');
      setTextMuted('#a8a29e');
    } else if (preset === 'emerald') {
      setCustomName('Deep Emerald');
      setCustomNameTh('มรกต เข้ม');
      setAccentPrimary('#10b981');
      setAccentHover('#059669');
      setBgPrimary('#04120c');
      setBgSurface('#0a2016');
      setBorderSubtle('#194a34');
      setBorderHover('#236749');
      setTextPrimary('#f0fdf4');
      setTextMuted('#86efac');
    } else if (preset === 'cyan') {
      setCustomName('Glacier Cyan');
      setCustomNameTh('ไซแอน กลาเซียร์');
      setAccentPrimary('#06b6d4');
      setAccentHover('#0891b2');
      setBgPrimary('#04131a');
      setBgSurface('#0a212c');
      setBorderSubtle('#1c4d63');
      setBorderHover('#276b8a');
      setTextPrimary('#f0fdfa');
      setTextMuted('#2dd4bf');
    } else if (preset === 'purple') {
      setCustomName('Velvet Purple');
      setCustomNameTh('ม่วง เวลเวท');
      setAccentPrimary('#a855f7');
      setAccentHover('#9333ea');
      setBgPrimary('#0f0a1e');
      setBgSurface('#18102e');
      setBorderSubtle('#2e1e54');
      setBorderHover('#432d78');
      setTextPrimary('#faf5ff');
      setTextMuted('#c084fc');
    }
  };

  const allThemes = [...THEMES, ...customThemes];

  return (
    <div className="w-full text-neutral-100 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
            <Palette className="w-3.5 h-3.5" /> Studio Color Palette & Theme Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
            ระบบสตูดิโอธีมและสร้างโทนสีส่วนตัว (Theme Studio)
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            เลือกธีมสำเร็จรูป หรือผสมโทนสีของตัวเองพร้อมพรีวิวการแสดงผลจริงแบบเรียลไทม์
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layout className="w-4 h-4" /> คลังธีมทั้งหมด ({allThemes.length})
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'creator'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> ผสมสีธีมใหม่ (Custom Creator)
          </button>
        </div>
      </div>

      {/* GALLERY TAB */}
      {activeTab === 'gallery' && (
        <div className="space-y-8">
          
          {/* Custom User-Created Themes Section (if any) */}
          {customThemes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> ธีมส่วนตัวที่คุณสร้างไว้ (Custom Themes)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customThemes.map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center -space-x-2">
                            <span className="w-6 h-6 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: t.bgPrimary }} />
                            <span className="w-6 h-6 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: t.accentPrimary }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white">{t.nameTh || t.name}</h3>
                            <span className="text-[10px] text-blue-400 font-mono">Custom Theme</span>
                          </div>
                        </div>

                        {isActive && (
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>

                      {/* Color Palette Strip */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                        <div className="h-6 rounded flex items-center justify-center text-[9px] font-mono text-white" style={{ backgroundColor: t.bgPrimary }}>BG</div>
                        <div className="h-6 rounded flex items-center justify-center text-[9px] font-mono text-white" style={{ backgroundColor: t.bgSurface }}>Card</div>
                        <div className="h-6 rounded flex items-center justify-center text-[9px] font-mono text-white" style={{ backgroundColor: t.accentPrimary }}>Btn</div>
                        <div className="h-6 rounded flex items-center justify-center text-[9px] font-mono text-white" style={{ backgroundColor: t.textMuted }}>Muted</div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          {isActive ? 'กำลังใช้งานอยู่' : 'ใช้งานธีมนี้'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomTheme(t.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                          title="ลบธีมนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Built-in System Themes Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-400" /> คลังธีมมาตรฐานระบบ (15 Built-in Palettes)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 group cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                    onClick={() => setTheme(t.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center -space-x-2 shrink-0">
                          <span className="w-6 h-6 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: t.previewBg }} />
                          <span className="w-6 h-6 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: t.previewAccent }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">{t.nameTh}</h3>
                          <span className="text-[10px] text-neutral-500 font-mono">{t.name}</span>
                        </div>
                      </div>

                      {t.isLight && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          Light
                        </span>
                      )}
                    </div>

                    {/* Color Swatches */}
                    <div className="h-10 rounded-xl overflow-hidden flex border border-neutral-800 shadow-inner">
                      <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-white/80" style={{ backgroundColor: t.previewBg }}>
                        BG
                      </div>
                      <div className="w-12 flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: t.previewAccent }}>
                        Accent
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(t.id);
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {isActive ? '✓ เปิดใช้งานอยู่' : 'สลับใช้ธีมนี้'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* CREATOR TAB WITH LIVE MOCKUP */}
      {activeTab === 'creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Color Picker Form Column (6 Cols) */}
          <form onSubmit={handleSaveCustomTheme} className="lg:col-span-6 bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" /> เครื่องมือผสมสีธีมใหม่ (Custom Color Palette)
              </h2>
              <span className="text-[10px] text-neutral-500">ปรับแต่งค่า Hex Code ได้อิสระ</span>
            </div>

            {/* Quick Color Presets */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">ชุดจานสีด่วน (Quick Presets):</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applyColorPreset('neon')} className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-bold transition-all cursor-pointer">
                  🌸 Cyber Neon
                </button>
                <button type="button" onClick={() => applyColorPreset('gold')} className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer">
                  👑 Imperial Gold
                </button>
                <button type="button" onClick={() => applyColorPreset('emerald')} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer">
                  🌿 Deep Emerald
                </button>
                <button type="button" onClick={() => applyColorPreset('cyan')} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer">
                  ❄️ Glacier Cyan
                </button>
                <button type="button" onClick={() => applyColorPreset('purple')} className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer">
                  🍇 Velvet Purple
                </button>
              </div>
            </div>

            {/* Theme Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">ชื่อธีมภาษาไทย</label>
                <input
                  type="text"
                  required
                  value={customNameTh}
                  onChange={(e) => setCustomNameTh(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="เช่น สตูดิโอนีออน"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">Theme Name (EN)</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Neon Studio"
                />
              </div>
            </div>

            {/* Color Pickers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Primary Accent Color */}
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>🎨 สีปุ่มหลัก (Accent Primary)</span>
                  <span className="font-mono text-[11px] text-neutral-400">{accentPrimary}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentPrimary}
                    onChange={(e) => {
                      setAccentPrimary(e.target.value);
                      setAccentHover(e.target.value);
                    }}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={accentPrimary}
                    onChange={(e) => setAccentPrimary(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Primary Background */}
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>⬛ สีพื้นหลังหลัก (Background)</span>
                  <span className="font-mono text-[11px] text-neutral-400">{bgPrimary}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgPrimary}
                    onChange={(e) => setBgPrimary(e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgPrimary}
                    onChange={(e) => setBgPrimary(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Card Surface */}
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>📦 สีพื้นหลังการ์ด (Card Surface)</span>
                  <span className="font-mono text-[11px] text-neutral-400">{bgSurface}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgSurface}
                    onChange={(e) => setBgSurface(e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgSurface}
                    onChange={(e) => setBgSurface(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Text Primary */}
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>📝 สีอักษรหลัก (Text Primary)</span>
                  <span className="font-mono text-[11px] text-neutral-400">{textPrimary}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textPrimary}
                    onChange={(e) => setTextPrimary(e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={textPrimary}
                    onChange={(e) => setTextPrimary(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm shadow-xl"
            >
              <Sparkles className="w-4 h-4" /> บันทึกและเริ่มใช้งานธีมส่วนตัวนี้
            </button>

          </form>

          {/* Interactive Live Mockup Preview Column (6 Cols) */}
          <div className="lg:col-span-6 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" /> พรีวิวตัวอย่างหน้าเว็บจริง (Live Website Mockup)
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Real-Time Render
              </span>
            </div>

            {/* Live Mockup Box rendering custom selected colors dynamically */}
            <div 
              className="rounded-3xl p-6 border shadow-2xl space-y-6 transition-colors duration-300 overflow-hidden relative"
              style={{
                backgroundColor: bgPrimary,
                borderColor: borderSubtle,
                color: textPrimary
              }}
            >
              
              {/* Mock Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: borderSubtle }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow" style={{ backgroundColor: accentPrimary }}>
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold" style={{ color: textPrimary }}>DICE Studio Atelier</h4>
                    <p className="text-[10px]" style={{ color: textMuted }}>{customNameTh || 'Sample Preview'}</p>
                  </div>
                </div>

                {/* Mock Capsule Nav */}
                <div className="flex items-center gap-1 p-1 rounded-full border text-[10px] font-bold" style={{ backgroundColor: bgSurface, borderColor: borderSubtle }}>
                  <span className="px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: accentPrimary }}>Queue</span>
                  <span className="px-2.5 py-1 rounded-full" style={{ color: textMuted }}>Gallery</span>
                </div>
              </div>

              {/* Mock Card Surface */}
              <div className="p-4 rounded-2xl border space-y-3 shadow-md" style={{ backgroundColor: bgSurface, borderColor: borderSubtle }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: textPrimary }}>VTuber Character Sheet #1024</span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accentPrimary }}>
                    Active Order
                  </span>
                </div>
                <p className="text-xs" style={{ color: textMuted }}>
                  จำลองการแสดงผลตัวอย่างองค์ประกอบ หัวข้อ การ์ด ปุ่มกด และช่องกรอกข้อมูลในเว็บไซต์
                </p>

                {/* Mock Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button type="button" className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition-opacity shadow" style={{ backgroundColor: accentPrimary }}>
                    ปุ่มหลัก (Primary Accent)
                  </button>
                  <button type="button" className="py-2 px-3 rounded-xl text-xs font-bold border transition-colors" style={{ borderColor: borderSubtle, color: textPrimary }}>
                    ปุ่มรอง
                  </button>
                </div>
              </div>

              {/* Mock Form Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase" style={{ color: textMuted }}>ตัวอย่างช่องกรอกข้อมูล (Input Control):</label>
                <div className="p-2.5 rounded-xl border text-xs flex justify-between items-center" style={{ backgroundColor: bgSurface, borderColor: borderSubtle, color: textPrimary }}>
                  <span>user@example.com</span>
                  <span className="text-[10px] font-mono" style={{ color: accentPrimary }}>Focused</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
