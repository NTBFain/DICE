'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api';
import ArtworkPreview from './ArtworkPreview';
import StudioDialog, { StudioOverlay } from './StudioDialog';

export default function SecureReference({ src, title, openLabel }: { src: string; title: string; openLabel?: string }) {
  const locale = useLocale();
  const t = useTranslations('SecureImage');
  const [url, setUrl] = useState('');
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    let localUrl = '';
    setUrl(''); setError(false); setIsPdf(false); setOpen(false);
    apiClient.get(src.replace(/^\/api(?=\/)/, ''), { responseType: 'blob' }).then(response => {
      if (!active) return;
      localUrl = URL.createObjectURL(response.data);
      setIsPdf(response.data.type?.split(';')[0].trim().toLowerCase() === 'application/pdf');
      setUrl(localUrl);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [src, attempt]);
  if (error) return <div className="rounded-xl border border-red-800 p-2 text-xs text-red-300" role="alert">{t('failedToLoad')}<button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 block underline">{locale === 'th' ? 'ลองใหม่' : 'Try again'}</button></div>;
  return <>
    <button type="button" disabled={!url} aria-label={`${openLabel || (locale === 'th' ? 'เปิดภาพอ้างอิง' : 'Open reference')}: ${title}`} onClick={() => setOpen(true)} className="block aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-500">
      {url && isPdf ? <span className="flex h-full items-center justify-center text-sm font-bold text-blue-300">PDF</span> : url ? <img src={url} alt={title} className="h-full w-full object-cover" /> : <span className="text-xs text-neutral-400">{locale === 'th' ? 'กำลังโหลด...' : 'Loading...'}</span>}
    </button>
    {open && url && isPdf && <StudioOverlay className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4">
      <StudioDialog label={title} onClose={() => setOpen(false)} className="w-full max-w-lg space-y-4 rounded-2xl border border-neutral-700 bg-neutral-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3"><h2 className="font-bold">{title}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label={locale === 'th' ? 'ปิดเอกสาร' : 'Close document'} className="rounded px-2 focus-visible:outline focus-visible:outline-2">×</button>
        </div>
        <p>{locale === 'th' ? 'หลักฐานนี้เป็นเอกสาร PDF ดาวน์โหลดเพื่อตรวจสอบเนื้อหา' : 'This proof is a PDF document. Download it to review its contents.'}</p>
        <a href={url} download="payment-proof.pdf" className="inline-block rounded-xl bg-blue-700 px-4 py-3 font-bold focus-visible:outline focus-visible:outline-2">{locale === 'th' ? 'ดาวน์โหลดเอกสาร PDF' : 'Download PDF document'}</a>
      </StudioDialog>
    </StudioOverlay>}
    <ArtworkPreview artwork={open && url && !isPdf ? { title, image_url: url } : null} onClose={() => setOpen(false)} />
  </>;
}
