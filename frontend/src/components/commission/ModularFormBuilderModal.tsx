'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FormBlock, FormBlockType, CommissionServiceDetail } from '@/types/commission';
import {
  X,
  Users,
  ShieldAlert,
  Smile,
  Maximize2,
  Image as ImageIcon,
  Zap,
  Lock,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  Check,
  Sparkles,
} from 'lucide-react';

interface ModularFormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: CommissionServiceDetail;
  onSave: (blocks: FormBlock[]) => void;
  isSaving: boolean;
}

const DEFAULT_BLOCK_TEMPLATES: FormBlock[] = [
  {
    id: 'block_char_count',
    type: 'CHARACTER_COUNT',
    enabled: true,
    title: 'จำนวนตัวละครในภาพ (Character Count)',
    description: 'จำกัดจำนวนตัวละครสูงสุด และคิดราคาเพิ่มเป็น % ต่อตัวละครเสริม',
    config: {
      max_chars: 4,
      extra_price_percent: 70,
    },
  },
  {
    id: 'block_scope_exclusions',
    type: 'SCOPE_EXCLUSIONS',
    enabled: true,
    title: 'ข้อจำกัดที่ไม่รับวาด (Scope Exclusions)',
    description: 'บังคับให้ผู้จ้างอ่านและกดยอมรับว่าผลงานไม่มีองค์ประกอบเหล่านี้',
    config: {
      exclusions: [
        'ไม่รับชุดเกราะซับซ้อน / หุ่นยนต์ Mecha',
        'ไม่รับสัตว์เลี้ยงหรือสิ่งมีชีวิตเสริม',
        'ไม่รับฉากสถาปัตยกรรมเมืองแบบละเอียด',
      ],
      require_ack: true,
    },
  },
  {
    id: 'block_pose_expression',
    type: 'POSE_EXPRESSION',
    enabled: true,
    title: 'ตัวเลือกท่าทางและอารมณ์ตัวละคร (Pose & Expression)',
    description: 'ให้ผู้จ้างเลือกความต้องการของท่าทางและสีหน้า',
    config: {
      options: [
        'ศิลปินออกแบบท่าทางให้อิสระ (Free Pose)',
        'ระบุท่าทางเฉพาะเจาะจง (Custom Pose)',
        'วาดอิงตามแบบภาพ Reference เป๊ะๆ',
      ],
    },
  },
  {
    id: 'block_canvas_specs',
    type: 'CANVAS_SPECS',
    enabled: true,
    title: 'ขนาดและสัดส่วนแคนวาส (Canvas Specs)',
    description: 'ตัวเลือกสัดส่วนภาพที่เปิดให้ผู้จ้างเลือก',
    config: {
      allowed_ratios: [
        '1:1 Square (โปรไฟล์ / โซเชียล)',
        '9:16 Story / มือถือ Wallpaper',
        '16:9 Desktop Wallpaper / หน้าปกยูทูป',
        'A4 Print 300 DPI (พิมพ์คมชัด)',
      ],
    },
  },
  {
    id: 'block_background_tier',
    type: 'BACKGROUND_TIER',
    enabled: true,
    title: 'ระดับความละเอียดฉากหลัง (Background Complexity)',
    description: 'แบ่งระดับฉากหลังและคิดราคาเพิ่มตามความยาก',
    config: {
      tiers: [
        { label: 'พื้นใส PNG / สีพื้นไล่เฉด', price: 0 },
        { label: 'ลวดลายกราฟิก / พร็อพประกอบง่ายๆ', price: 300 },
        { label: 'ฉากสภาพแวดล้อมเต็มรูปแบบ (Full Scenic)', price: 1200 },
      ],
    },
  },
  {
    id: 'block_rush_mode',
    type: 'RUSH_MODE',
    enabled: false,
    title: 'งานเร่งด่วน (Rush Order Mode)',
    description: 'คิดค่าบริการเร่งด่วนพิเศษเป็น % ของราคาพื้นฐาน',
    config: {
      rates: [
        { days: 3, percent: 50 },
        { days: 7, percent: 25 },
      ],
    },
  },
  {
    id: 'block_privacy_nda',
    type: 'PRIVACY_NDA',
    enabled: false,
    title: 'ค่าสัญญาปิดเป็นความลับ / NDA (Privacy Option)',
    description: 'คิดค่าธรรมเนียมสำหรับการห้ามโพสต์ผลงานก่อนวันเปิดตัว',
    config: {
      price: 500,
      description: 'ไม่นำภาพไปโพสต์โปรโมทจนกว่าผู้จ้างจะอนุญาต',
    },
  },
  {
    id: 'block_custom_questions',
    type: 'CUSTOM_QUESTIONS',
    enabled: false,
    title: 'คำถามพิเศษเพิ่มเติม (Custom Free-form Questions)',
    description: 'เพิ่มคำถามเฉพาะสำหรับสเกลนี้ เช่น โทนสี Mood & Tone หรือไฟล์ที่ต้องการ',
    config: {
      questions: [
        {
          id: 'q_mood',
          label: 'Mood & Tone หรือโทนสีหลักที่ต้องการ',
          type: 'TEXT',
          required: false,
        },
      ],
    },
  },
];

export function ModularFormBuilderModal({
  isOpen,
  onClose,
  service,
  onSave,
  isSaving,
}: ModularFormBuilderModalProps) {
  const [blocks, setBlocks] = useState<FormBlock[]>([]);
  const [newExclusionTag, setNewExclusionTag] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    if (service.form_schema && service.form_schema.length > 0) {
      // Merge with default templates so any newly added platform blocks exist
      const existingMap = new Map(service.form_schema.map((b) => [b.type, b]));
      const merged = DEFAULT_BLOCK_TEMPLATES.map((tmpl) => {
        const existing = existingMap.get(tmpl.type);
        return existing ? { ...tmpl, ...existing } : tmpl;
      });
      setBlocks(merged);
    } else {
      setBlocks(DEFAULT_BLOCK_TEMPLATES);
    }
  }, [isOpen, service]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleBlock = (index: number) => {
    const updated = [...blocks];
    updated[index].enabled = !updated[index].enabled;
    setBlocks(updated);
  };

  const updateBlockConfig = (index: number, newConfig: Record<string, any>) => {
    const updated = [...blocks];
    updated[index].config = { ...updated[index].config, ...newConfig };
    setBlocks(updated);
  };

  const getBlockIcon = (type: FormBlockType) => {
    switch (type) {
      case 'CHARACTER_COUNT':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'SCOPE_EXCLUSIONS':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'POSE_EXPRESSION':
        return <Smile className="w-4 h-4 text-pink-400" />;
      case 'CANVAS_SPECS':
        return <Maximize2 className="w-4 h-4 text-cyan-400" />;
      case 'BACKGROUND_TIER':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'RUSH_MODE':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'PRIVACY_NDA':
        return <Lock className="w-4 h-4 text-purple-400" />;
      case 'CUSTOM_QUESTIONS':
        return <HelpCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Custom Modular Form Builder</h2>
                <span className="text-[10px] bg-neutral-800 text-neutral-300 font-bold px-2 py-0.5 rounded-full border border-neutral-700">
                  {service.title}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                เลือกและตั้งค่าหัวข้อกล่องฟอร์มที่ต้องการให้ผู้จ้างกรอกเฉพาะสเกลนี้
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {blocks.map((block, idx) => {
              const isEnabled = block.enabled;
              return (
                <div
                  key={block.id}
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isEnabled
                      ? 'bg-neutral-950/70 border-neutral-700/80 shadow-sm'
                      : 'bg-neutral-900/40 border-neutral-800/60 opacity-65'
                  }`}
                >
                  {/* Block Header */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3 bg-neutral-900/50 border-b border-neutral-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
                        {getBlockIcon(block.type)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {block.title}
                          {isEnabled ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                              เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
                              ปิดอยู่
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">{block.description}</p>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      data-testid={`toggle-${block.type}`}
                      onClick={() => toggleBlock(idx)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        isEnabled ? 'bg-emerald-600' : 'bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Block Configuration Panel (when enabled) */}
                  {isEnabled && (
                    <div className="p-4 bg-neutral-950/40 space-y-4 text-xs">
                      {/* 1. CHARACTER COUNT */}
                      {block.type === 'CHARACTER_COUNT' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-neutral-400 font-bold block mb-1">
                              จำนวนตัวละครสูงสุดใน 1 ภาพ:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={block.config.max_chars || 4}
                              onChange={(e) =>
                                updateBlockConfig(idx, { max_chars: Number(e.target.value) })
                              }
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white font-bold"
                            />
                            <p className="text-[11px] text-neutral-500 mt-1">
                              ผู้จ้างสามารถเลือกตัวละครได้สูงสุดตามจำนวนนี้
                            </p>
                          </div>
                          <div>
                            <label className="text-neutral-400 font-bold block mb-1">
                              ราคาเพิ่มต่อ 1 ตัวละครเสริม (% ของราคาพื้นฐาน):
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={200}
                                value={block.config.extra_price_percent || 70}
                                onChange={(e) =>
                                  updateBlockConfig(idx, {
                                    extra_price_percent: Number(e.target.value),
                                  })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white font-bold pr-8"
                              />
                              <span className="absolute right-3 top-2.5 text-neutral-400 font-bold">
                                %
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-1">
                              เช่น 70% ของ ฿{service.base_price.toLocaleString()} = +฿
                              {(service.base_price * ((block.config.extra_price_percent || 70) / 100)).toLocaleString()}/ตัว
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 2. SCOPE EXCLUSIONS */}
                      {block.type === 'SCOPE_EXCLUSIONS' && (
                        <div className="space-y-3">
                          <label className="text-neutral-400 font-bold block">
                            รายการประเภทงานที่ไม่รับวาด (ผู้จ้างต้องอ่านและกดยืนยัน):
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(block.config.exclusions || []).map((ex: string, exIdx: number) => (
                              <span
                                key={exIdx}
                                className="bg-red-950/40 border border-red-800/50 text-red-300 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs"
                              >
                                🚫 {ex}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = (block.config.exclusions || []).filter(
                                      (_: any, i: number) => i !== exIdx
                                    );
                                    updateBlockConfig(idx, { exclusions: next });
                                  }}
                                  className="text-red-400 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newExclusionTag}
                              onChange={(e) => setNewExclusionTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!newExclusionTag.trim()) return;
                                  const next = [...(block.config.exclusions || []), newExclusionTag.trim()];
                                  updateBlockConfig(idx, { exclusions: next });
                                  setNewExclusionTag('');
                                }
                              }}
                              placeholder="พิมพ์ข้อจำกัดงานที่ไม่รับ เช่น ไม่รับวาดเกราะเหล็ก..."
                              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newExclusionTag.trim()) return;
                                const next = [...(block.config.exclusions || []), newExclusionTag.trim()];
                                updateBlockConfig(idx, { exclusions: next });
                                setNewExclusionTag('');
                              }}
                              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold cursor-pointer"
                            >
                              + เพิ่ม
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. POSE & EXPRESSION */}
                      {block.type === 'POSE_EXPRESSION' && (
                        <div className="space-y-2">
                          <label className="text-neutral-400 font-bold block">
                            ตัวเลือกให้ผู้จ้างระบุท่าทาง:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {(block.config.options || []).map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl text-neutral-300 font-medium"
                              >
                                • {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. CANVAS SPECS */}
                      {block.type === 'CANVAS_SPECS' && (
                        <div className="space-y-2">
                          <label className="text-neutral-400 font-bold block">
                            สัดส่วนภาพที่อนุญาต:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(block.config.allowed_ratios || []).map((ratio: string, rIdx: number) => (
                              <div
                                key={rIdx}
                                className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl text-center font-bold text-neutral-300"
                              >
                                {ratio}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. BACKGROUND TIER */}
                      {block.type === 'BACKGROUND_TIER' && (
                        <div className="space-y-3">
                          <label className="text-neutral-400 font-bold block">
                            ระดับความละเอียดฉากหลัง &amp; ราคาบวกเพิ่ม:
                          </label>
                          <div className="space-y-2">
                            {(block.config.tiers || []).map((t: any, tIdx: number) => (
                              <div
                                key={tIdx}
                                className="flex items-center justify-between gap-3 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800"
                              >
                                <input
                                  type="text"
                                  value={t.label}
                                  onChange={(e) => {
                                    const next = [...block.config.tiers];
                                    next[tIdx].label = e.target.value;
                                    updateBlockConfig(idx, { tiers: next });
                                  }}
                                  className="flex-1 bg-transparent text-white font-medium focus:outline-none"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-neutral-500 font-bold">+฿</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={t.price}
                                    onChange={(e) => {
                                      const next = [...block.config.tiers];
                                      next[tIdx].price = Number(e.target.value);
                                      updateBlockConfig(idx, { tiers: next });
                                    }}
                                    className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg p-1 text-right text-emerald-400 font-bold"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. RUSH MODE */}
                      {block.type === 'RUSH_MODE' && (
                        <div className="space-y-3">
                          <label className="text-neutral-400 font-bold block">
                            เงื่อนไขงานเร่งด่วน:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(block.config.rates || []).map((rate: any, rIdx: number) => (
                              <div
                                key={rIdx}
                                className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center justify-between"
                              >
                                <span className="font-bold text-white">เร่งด่วนภายใน {rate.days} วัน</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-400 font-bold">+{rate.percent}%</span>
                                  <span className="text-[10px] text-neutral-500">(+฿{(service.base_price * (rate.percent / 100)).toLocaleString()})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. PRIVACY NDA */}
                      {block.type === 'PRIVACY_NDA' && (
                        <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                          <div>
                            <span className="font-bold text-white block">ค่าบริการปกปิดผลงาน (NDA Fee)</span>
                            <span className="text-neutral-400 text-[11px]">ไม่เผยแพร่ผลงานสู่ที่สาธารณะก่อนได้รับอนุญาต</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-500 font-bold">฿</span>
                            <input
                              type="number"
                              min={0}
                              value={block.config.price || 500}
                              onChange={(e) =>
                                updateBlockConfig(idx, { price: Number(e.target.value) })
                              }
                              className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg p-1 text-right text-purple-400 font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {/* 8. CUSTOM QUESTIONS */}
                      {block.type === 'CUSTOM_QUESTIONS' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-neutral-400 font-bold block">
                              คำถามพิเศษเฉพาะสเกลนี้:
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const newQ = {
                                  id: `q_${Date.now()}`,
                                  label: 'คำถามใหม่',
                                  type: 'TEXT',
                                  required: false,
                                };
                                const next = [...(block.config.questions || []), newQ];
                                updateBlockConfig(idx, { questions: next });
                              }}
                              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> เพิ่มคำถาม
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(block.config.questions || []).map((q: any, qIdx: number) => (
                              <div
                                key={q.id || qIdx}
                                className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center gap-3"
                              >
                                <input
                                  type="text"
                                  value={q.label}
                                  onChange={(e) => {
                                    const next = [...block.config.questions];
                                    next[qIdx].label = e.target.value;
                                    updateBlockConfig(idx, { questions: next });
                                  }}
                                  placeholder="ระบุคำถาม เช่น โทนสีที่ชอบ..."
                                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-white"
                                />
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const next = [...block.config.questions];
                                    next[qIdx].type = e.target.value;
                                    updateBlockConfig(idx, { questions: next });
                                  }}
                                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white font-bold"
                                >
                                  <option value="TEXT">ข้อความสั้น (Text)</option>
                                  <option value="TEXTAREA">ข้อความยาว (Paragraph)</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = block.config.questions.filter(
                                      (_: any, i: number) => i !== qIdx
                                    );
                                    updateBlockConfig(idx, { questions: next });
                                  }}
                                  className="text-neutral-500 hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            เปิดใช้งาน {blocks.filter((b) => b.enabled).length} / {blocks.length} หัวข้อ
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onSave(blocks)}
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกรูปแบบฟอร์มนี้'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
