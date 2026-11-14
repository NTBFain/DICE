'use client';

import { useTranslations } from 'next-intl';

import { useDialogFocus } from '@/components/useDialogFocus';
import { useState, useEffect, useRef } from 'react';
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
  const studio = useTranslations('Studio');
  const dialog = useRef<HTMLFormElement>(null);
  useDialogFocus(isOpen, dialog, onClose);
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
        ref={dialog} role="dialog" aria-modal="true" aria-label={studio('edit_76_0')} tabIndex={-1}
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
              <h3 className="text-sm sm:text-base font-bold text-white">{studio('edit_76_0')}</h3>
              <p className="text-[11px] text-neutral-400">{studio('edit_77_0')}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close service editor"
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
                {' '}{studio('edit_95_0')}{' '}<span className="text-red-400">*</span>:
              </label>
              <input
                type="text"
                required
                aria-label={studio('edit_95_0')} value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={studio('edit_102_0')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">{studio('edit_108_0')}</label>
              <input
                type="text"
                aria-label={studio('edit_108_0')} value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={studio('edit_113_0')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-300 font-bold block mb-1">
              {' '}{studio('edit_121_0')}{' '}</label>
            <textarea
              rows={2}
              aria-label={studio('edit_121_0')} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={studio('edit_127_0')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                {' '}{studio('edit_135_0')}{' '}<span className="text-red-400">*</span>:
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                aria-label={studio('edit_135_0')} value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                {' '}{studio('edit_150_0')}{' '}</label>
              <input
                type="number"
                min={1}
                max={365}
                required
                aria-label={studio('edit_150_0')} value={estimatedDays}
                onChange={(e) => setEstimatedDays(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                {' '}{studio('edit_165_0')}{' '}</label>
              <input
                type="number"
                min={1}
                max={100}
                required
                aria-label={studio('edit_165_0')} value={maxSlots}
                onChange={(e) => setMaxSlots(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-bold block mb-1">
                {' '}{studio('edit_180_0')}{' '}</label>
              <select
                aria-label={studio('edit_180_0')} value={isFormOpen ? 'OPEN' : 'CLOSED'}
                onChange={(e) => setIsFormOpen(e.target.value === 'OPEN')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="OPEN">{studio('edit_187_0')}</option>
                <option value="CLOSED">{studio('edit_188_0')}</option>
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
            {' '}{studio('edit_201_0')}{' '}</button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {' '}{studio('edit_210_0')}{' '}</>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> {' '}{studio('edit_214_0')}{' '}</>
            )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
