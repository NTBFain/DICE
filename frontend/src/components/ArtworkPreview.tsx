'use client';

import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';

type PreviewArtwork = { title: string; image_url: string; description?: string };

export default function ArtworkPreview({ artwork, onClose }: { artwork: PreviewArtwork | null; onClose: () => void }) {
  const t = useTranslations('Portfolio');
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(!!artwork, dialog, onClose);
  if (!artwork) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-950 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-neutral-950/95 p-4">
          <h2 id={titleId} className="font-bold">{artwork.title}</h2>
          <button type="button" aria-label={t('closePreview')} onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-blue-500"><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <img src={artwork.image_url} alt={artwork.title} className="mx-auto max-h-[70vh] w-full object-contain" />
        {artwork.description && <p className="whitespace-pre-wrap p-4 text-sm text-neutral-300">{artwork.description}</p>}
      </div>
    </div>, document.body
  );
}
