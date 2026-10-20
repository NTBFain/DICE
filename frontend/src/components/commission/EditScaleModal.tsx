'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CommissionServiceDetail } from '@/types/commission';
import { X, Save, Edit3, Loader2 } from 'lucide-react';

interface EditScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: CommissionServiceDetail;
  onSave: (data: Partial<CommissionServiceDetail>) => void;
  isSaving: boolean;
}

export function EditScaleModal({
  isOpen,
  onClose,
  service,
  onSave,
  isSaving,
}: EditScaleModalProps) {
  const [title, setTitle] = useState(service.title || '');
  const [category, setCategory] = useState(service.category || 'Illustration');
  const [description, setDescription] = useState(service.description || '');
  const [basePrice, setBasePrice] = useState(service.base_price || 500);
  const [estimatedDays, setEstimatedDays] = useState(service.estimated_days || 7);
  const [maxSlots, setMaxSlots] = useState(service.max_slots || 3);
  const [isFormOpen, setIsFormOpen] = useState(service.is_form_open ?? true);

  useEffect(() => {
    if (service) {
      setTitle(service.title || '');
      setCategory(service.category || 'Illustration');
      setDescription(service.description || '');
      setBasePrice(service.base_price || 500);
      setEstimatedDays(service.estimated_days || 7);
      setMaxSlots(service.max_slots || 3);
      setIsFormOpen(service.is_form_open ?? true);
    }
  }, [service]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      base_price: Number(basePrice),
      estimated_days: Number(estimatedDays),
      max_slots: Number(maxSlots),
      is_form_open: isFormOpen,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 shrink-0 bg-neutral-900/95">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">แก้ไขข้อมูลสเกลงาน</h3>
              <p className="text-[11px] text-neutral-400">ปรับชื่อสเกล ราคา ระยะเวลา และจำนวนสล็อต</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-neutral-300 font-bold block mb-1">
                ชื่อสเกลงาน (Scale Title) <span className="text-red-400">*</span>:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Full-body Character, Chibi Emote..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">หมวดหมู่ (Category):</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น Illustration..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-300 font-bold block mb-1">
              คำอธิบายรายละเอียดงาน (Description):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุสิ่งที่รวมในราคานี้ เช่น วาดเต็มตัว ลงสีแบบละเอียด ฉากหลังพื้นใส..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                ราคาเริ่มต้น (฿) <span className="text-red-400">*</span>:
              </label>
              <input
                type="number"
                min={1}
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                เวลาเฉลี่ย (วัน):
              </label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                สล็อตสูงสุด:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={maxSlots}
                onChange={(e) => setMaxSlots(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                สถานะฟอร์ม:
              </label>
              <select
                value={isFormOpen ? 'OPEN' : 'CLOSED'}
                onChange={(e) => setIsFormOpen(e.target.value === 'OPEN')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="OPEN">🟢 เปิดรับ</option>
                <option value="CLOSED">⚫ ปิดรับ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-900/95 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> บันทึกการแก้ไข
              </>
            )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
