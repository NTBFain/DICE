'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaymentSettings, savePaymentSettings, importPromptPayQr, type PaymentSettings } from '@/lib/paymentApi';
import { getErrorMessage } from '@/lib/errorMessage';

export default function PaymentSettingsPanel() {
  const t = useTranslations('Payments'); const cache = useQueryClient();
  const query = useQuery({queryKey: ['payment-settings'], queryFn: getPaymentSettings, retry: false});
  const [draft, setDraft] = useState<PaymentSettings | null>(null);
  const [fee, setFee] = useState('5.00'); const [busy, setBusy] = useState(false);
  const lock = useRef(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => {if (query.data) {setDraft(query.data); setFee((query.data.fee_bps / 100).toFixed(2));}}, [query.data]);
  async function importQr(file?: File) {
    if (!file || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await importPromptPayQr(file);
      setDraft(current => current ? {...current, mobile_number: result.mobile_number} : current);
      setNotice(t('importedReview'));
    } catch (error) {setError(getErrorMessage(error, t('importFailed')));}
    finally {lock.current = false; setBusy(false);}
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!draft || lock.current) return;
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(fee) || Number(fee) > 100) {setError(t('invalidFee')); return;}
    const [whole, fraction = ''] = fee.split('.'); const bps = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const saved = await savePaymentSettings({...draft, fee_bps: bps});
      cache.setQueryData(['payment-settings'], saved); setDraft(saved); setNotice(t('saved'));
    } catch (error) {setError(getErrorMessage(error, t('failed')));}
    finally {lock.current = false; setBusy(false);}
  }
  if (query.isPending) return <p role="status">{t('working')}</p>;
  if (!draft) return <div role="alert">{t('failed')} <button onClick={() => query.refetch()} className="underline">{t('retry')}</button></div>;
  return <section className="space-y-4 rounded-2xl border border-neutral-700 p-5">
    <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>
    <p className="text-sm">{t('settingsExplanation')}</p>
    <form onSubmit={save} className="space-y-4">
      <label className="flex items-center gap-3"><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={event => setDraft({...draft, enabled: event.target.checked})} />{t('enable')}</label>
      <label className="block space-y-2"><span>{t('recipient')}</span><input required={draft.enabled} maxLength={120} value={draft.recipient_name} disabled={busy} onChange={event => setDraft({...draft,recipient_name:event.target.value})} className="block w-full rounded-lg border border-neutral-500 bg-transparent p-3" /></label>
      <label className="block space-y-2"><span>{t('importQr')}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => {void importQr(event.target.files?.[0]); event.target.value = '';}} className="block w-full" /><span className="block text-sm text-neutral-400">{t('importHelp')}</span></label>
      <label className="block space-y-2"><span>{t('mobile')}</span><input type="tel" inputMode="tel" required={draft.enabled} maxLength={30} value={draft.mobile_number} disabled={busy} onChange={event => setDraft({...draft,mobile_number:event.target.value})} className="block w-full rounded-lg border border-neutral-500 bg-transparent p-3" /></label>
      <label className="block space-y-2"><span>{t('feePercent')}</span><input type="text" inputMode="decimal" required value={fee} disabled={busy} onChange={event => setFee(event.target.value)} className="block w-full rounded-lg border border-neutral-500 bg-transparent p-3" /></label>
      <p className="text-sm">{t('freezeExplanation')}</p>
      {error && <p role="alert" className="rounded-lg border border-red-500 p-3">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500 p-3">{notice}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="rounded-xl bg-blue-700 px-5 py-3 font-bold disabled:opacity-50">{busy ? t('working') : t('saveSettings')}</button><button type="button" onClick={() => query.refetch()} disabled={busy} className="rounded-xl border px-5 py-3">{t('reloadSettings')}</button></div>
    </form>
  </section>;
}
