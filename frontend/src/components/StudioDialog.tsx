'use client';

import { useRef, type ReactNode, type FormHTMLAttributes } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { createPortal } from 'react-dom';

export default function StudioDialog({ children, label, onClose, className }: {
  children: ReactNode; label: string; onClose: () => void; className?: string;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(true, dialog, onClose);
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={className}>{children}</div>;
}

export function StudioFormDialog({ children, label, onClose, ...props }: FormHTMLAttributes<HTMLFormElement> & {
  label: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLFormElement>(null);
  useDialogFocus(true, dialog, onClose);
  return <form {...props} ref={dialog} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</form>;
}


/** Keep modal backdrops outside page stacking contexts and above studio navigation. */
export function StudioOverlay({ children, className }: { children: ReactNode; className: string }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<div className={className}>{children}</div>, document.body);
}
