'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import StudioDialog, { StudioOverlay } from '@/components/StudioDialog';
import SecureImage from '@/components/SecureImage';
import { apiClient, payInvoice } from '@/lib/api';
import { createPaymentInstruction, formatSatang, type PaymentInstruction } from '@/lib/paymentApi';
import { getDownloadErrorMessage, getErrorMessage } from '@/lib/errorMessage';

export default function PromptPayButton({invoiceId, onUploaded}: {invoiceId: number; onUploaded: () => void}) {
  const t = useTranslations('Payments');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  async function load() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setOpen(true);
    try {setInstruction(await createPaymentInstruction(invoiceId));}
    catch (error) {setError(getErrorMessage(error, t('unavailable')));}
    finally {busyRef.current = false; setBusy(false);}
  }
  async function download() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const response = await apiClient.get(`/payments/invoices/${invoiceId}/qr`, {responseType: 'blob'});
      const url = URL.createObjectURL(response.data); const link = document.createElement('a');
      link.href = url; link.download = `DICE-invoice-${invoiceId}-PromptPay.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {setError(await getDownloadErrorMessage(error, t('failed')));}
    finally {busyRef.current = false; setBusy(false);}
  }
  async function upload(file?: File) {
    if (!file || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {await payInvoice(invoiceId, file); setUploaded(true); onUploaded();}
    catch (error) {setError(getErrorMessage(error, t('failed')));}
    finally {busyRef.current = false; setBusy(false);}
  }
  const close = () => {if (!busyRef.current) setOpen(false);};
  return <>
    <button type="button" onClick={load} disabled={busy} className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">{t('payWithPromptPay')}</button>
    {open && <StudioOverlay className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <StudioDialog label={t('payWithPromptPay')} onClose={close} className="my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-neutral-950 shadow-xl dark:bg-neutral-950 dark:text-white">
        <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{t('payWithPromptPay')}</h2><button type="button" onClick={close} disabled={busy} aria-label={t('close')} className="rounded px-3 py-1 text-xl focus-visible:outline-2">×</button></div>
        {busy && <p role="status" className="my-4">{t('working')}</p>}
        {error && <div role="alert" className="my-4 space-y-2 rounded-xl border border-red-500 p-3"><p>{t('unavailable')}</p><p>{error}</p><button type="button" onClick={load} disabled={busy} className="underline">{t('retry')}</button></div>}
        {instruction && <div className="mt-4 space-y-4">
          <dl className="space-y-2"><div><dt>{t('recipient')}</dt><dd className="font-bold break-words">{instruction.recipient_name}</dd></div><div><dt>{t('mobile')}</dt><dd className="font-mono">{instruction.mobile_number}</dd></div><div><dt>{t('amount')}</dt><dd className="text-2xl font-bold">{formatSatang(instruction.amount_satang, locale)}</dd></div></dl>
          <SecureImage src={instruction.qr_url} alt={t('invoiceQr')} className="mx-auto h-auto w-64 max-w-full bg-white" />
          <button type="button" onClick={download} disabled={busy} className="w-full rounded-xl border px-4 py-3 font-bold disabled:opacity-50">{t('downloadQr')}</button>
          <ol className="list-decimal space-y-2 pl-6 text-sm"><li>{t('stepScan')}</li><li>{t('stepCheck')}</li><li>{t('stepUpload')}</li></ol>
          <p className="rounded-xl border border-amber-500 p-3 text-sm">{t('manualWarning')}</p>
          <p className="text-sm">{t('irrevocableWarning')}</p>
          {uploaded ? <p role="status" className="rounded-xl bg-amber-100 p-3 text-amber-950">{t('pendingReview')}</p> : <label className="block space-y-2 rounded-xl border p-3 text-sm"><span className="font-bold">{t('uploadProof')}</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy} onChange={event => {void upload(event.target.files?.[0]); event.target.value = '';}} className="block w-full" /></label>}
        </div>}
      </StudioDialog>
    </StudioOverlay>}
  </>;
}
