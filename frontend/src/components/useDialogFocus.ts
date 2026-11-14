'use client';

import { RefObject, useEffect, useRef } from 'react';

const activeDialogs: HTMLElement[] = [];
let initialBodyOverflow = '';

export function useDialogFocus(open: boolean, dialog: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const container = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!activeDialogs.length) initialBodyOverflow = document.body.style.overflow;
    activeDialogs.push(container);
    const controls = () => Array.from(container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    )).filter(element => element.getClientRects().length > 0);
    document.body.style.overflow = 'hidden';
    (controls()[0] || container).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (activeDialogs.at(-1) !== container) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close.current();
      } else if (event.key === 'Tab') {
        const items = controls();
        const target = event.shiftKey ? items.at(-1) : items[0];
        if (!items.length || !container.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === items[0]) ||
          (!event.shiftKey && document.activeElement === items.at(-1))) {
          event.preventDefault(); (target || container).focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      const index = activeDialogs.indexOf(container);
      if (index !== -1) activeDialogs.splice(index, 1);
      if (!activeDialogs.length) document.body.style.overflow = initialBodyOverflow;
      if (previousFocus?.isConnected && (!activeDialogs.length || activeDialogs.at(-1)?.contains(previousFocus))) previousFocus.focus();
    };
  }, [open, dialog]);
}
