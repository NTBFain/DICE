'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getLedger, quotePayout, recordPayout, formatSatang, type PayoutQuote } from '@/lib/paymentApi';
import { getErrorMessage } from '@/lib/errorMessage';
import { parseApiDate } from '@/lib/apiDate';
import SecureReference from '@/components/SecureReference';
import StudioDialog, { StudioOverlay } from '@/components/StudioDialog';
import PayoutRequestsPanel from './PayoutRequestsPanel';

export default function LedgerPanel({admin = false}: {admin?: boolean}) {
  const t = useTranslations('Payments'); const locale = useLocale();
  const money = (amount: number) => formatSatang(amount, locale);
  const query = useQuery({queryKey: ['payment-ledger'], queryFn: getLedger, retry: false});
  const [artistId, setArtistId] = useState(''); const [selected, setSelected] = useState<number[]>([]);
  const [quote, setQuote] = useState<PayoutQuote | null>(null); const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null); const [confirmed, setConfirmed] = useState(false);
  const [key, setKey] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function review() {
    if (lock.current || !selected.length) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {setQuote(await quotePayout(Number(artistId), selected)); setKey(crypto.randomUUID()); setConfirmed(false);}
    catch (error) {setError(getErrorMessage(error, t('failed'))); await query.refetch();}
    finally {lock.current = false; setBusy(false);}
  }
  async function record(event: React.FormEvent) {
    event.preventDefault(); if (!quote || !proof || !confirmed || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {await recordPayout(quote, reference, proof, key); setQuote(null); setSelected([]); setProof(null); setReference(''); setConfirmed(false); setNotice(t('payoutRecorded')); await query.refetch();}
    catch (error) {setError(getErrorMessage(error, t('failed')));}
    finally {lock.current = false; setBusy(false);}
  }
  const close = () => {if (!lock.current) {setQuote(null); setError('');}};
  if (query.isPending) return <p role="status">{t('working')}</p>;
  if (!query.data) return <div role="alert">{t('failed')} <button onClick={() => query.refetch()} className="underline">{t('retry')}</button></div>;
  const data = query.data;
  const artists = [...new Map(data.orders.map(row => [row.artist_id, row.artist_name])).entries()];
  const rows = data.orders.filter(row => !admin || !artistId || row.artist_id === Number(artistId));
  return <section className="space-y-5 rounded-2xl border border-neutral-700 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{admin ? t('payoutsTitle') : t('artistLedgerTitle')}</h2><button type="button" disabled={busy} onClick={() => query.refetch()} className="rounded-xl border px-4 py-2">{t('refresh')}</button></div>
    <p className="text-sm">{t('ledgerExplanation')}</p>
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {([['historicalGross',data.approved_invoice_gross_satang], ['platformCollections',data.platform_collections_satang], ['eligibleNet',data.eligible_net_satang], ['requestedNet',data.requested_net_satang], ['recordedPayouts',data.recorded_payout_net_satang]] as const).map(([label,value]) => <div key={label} className="rounded-xl border border-neutral-600 p-4"><dt className="text-sm">{t(label)}</dt><dd className="mt-2 text-xl font-bold">{money(value)}</dd></div>)}
    </dl>
    <PayoutRequestsPanel admin={admin} ledger={data} />
    {notice && <p role="status" className="rounded-xl border border-emerald-500 p-3">{notice}</p>}
    {error && !quote && <p role="alert" className="rounded-xl border border-red-500 p-3">{error}</p>}
    {admin && <div className="flex flex-wrap items-end gap-3"><label className="block space-y-2"><span>{t('selectArtist')}</span><select value={artistId} disabled={busy} onChange={event => {setArtistId(event.target.value); setSelected([]);}} className="block max-w-full rounded-xl border border-neutral-500 bg-neutral-900 p-3 text-white"><option value="">{t('allArtists')}</option>{artists.map(([id,name]) => <option key={id} value={id}>{name} (#{id})</option>)}</select></label><button type="button" disabled={busy || !artistId || !selected.length} onClick={review} className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40">{t('reviewPayout')} ({selected.length})</button></div>}
    <h3 className="text-lg font-bold">{t('ordersLedger')}</h3>
    {!rows.length && <p>{t('noRecords')}</p>}
    <div className="grid gap-3 lg:grid-cols-2">{rows.map(row => <article key={row.order_id} className="space-y-3 rounded-xl border border-neutral-600 p-4">
      <div className="flex items-start gap-3">{admin && <input type="checkbox" aria-label={`${t('selectOrder')} ${row.order_id}`} checked={selected.includes(row.order_id)} disabled={busy || !artistId || row.status !== 'ELIGIBLE'} onChange={event => setSelected(current => event.target.checked ? [...current,row.order_id] : current.filter(id => id !== row.order_id))} className="mt-1 h-5 w-5 shrink-0" />}<div className="min-w-0"><h4 className="break-words font-bold">#{row.order_id} {row.title}</h4>{admin && <p className="text-sm">{row.artist_name}</p>}<p className="mt-1 text-sm font-semibold">{t(`states.${row.status}`)}</p></div></div>
      <dl className="grid grid-cols-3 gap-2 text-sm"><div><dt>{t('gross')}</dt><dd className="break-words font-bold">{money(row.gross_satang)}</dd></div><div><dt>{t('fee')} ({(row.fee_bps / 100).toFixed(2)}%)</dt><dd className="break-words font-bold">{money(row.fee_satang)}</dd></div><div><dt>{t('net')}</dt><dd className="break-words font-bold">{money(row.net_satang)}</dd></div></dl>
    </article>)}</div>
    <h3 className="text-lg font-bold">{t('payoutHistory')}</h3>
    {!data.payouts.length && <p>{t('noRecords')}</p>}
    <div className="grid gap-3 lg:grid-cols-2">{data.payouts.map(payout => <article key={payout.id} className="space-y-3 rounded-xl border border-neutral-600 p-4"><h4 className="font-bold">{t('payoutNumber')} #{payout.id} · {money(payout.net_satang)}</h4><p className="break-words">{t('reference')}: {payout.transfer_reference}</p><p className="text-sm">{parseApiDate(payout.created_at).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US')} · {t('artistId')} #{payout.artist_id}</p><p className="text-sm">{t('gross')} {money(payout.gross_satang)} · {t('fee')} {money(payout.fee_satang)}</p><p className="text-sm">{t('ordersLedger')}: {payout.items.map(item => `#${item.order_id}`).join(', ')}</p><div className="w-32"><SecureReference src={payout.proof_url} title={`${t('payoutProof')} #${payout.id}`} openLabel={t('openProof')} /></div></article>)}</div>
    {quote && <StudioOverlay className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"><StudioDialog label={t('reviewPayout')} onClose={close} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-neutral-950 p-5 text-white"><form onSubmit={record} className="space-y-4"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{t('reviewPayout')}</h2><button type="button" onClick={close} disabled={busy} aria-label={t('close')} className="px-3 text-xl">×</button></div><p>{t('artistId')} #{quote.artist_id} · {t('ordersLedger')} {quote.items.map(row => `#${row.order_id}`).join(', ')}</p><dl className="space-y-2">{(['gross','fee','net'] as const).map(label => <div key={label} className="flex justify-between gap-3"><dt>{t(label)}</dt><dd className="font-bold">{money(quote[`${label}_satang`])}</dd></div>)}</dl><p className="rounded-xl border border-amber-500 p-3 text-sm">{t('externalTransferWarning')}</p><label className="block space-y-2"><span>{t('reference')}</span><input required maxLength={200} value={reference} disabled={busy} onChange={event => setReference(event.target.value)} className="block w-full rounded-xl border bg-transparent p-3" /></label><label className="block space-y-2"><span>{t('payoutProof')}</span><input type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy} onChange={event => setProof(event.target.files?.[0] || null)} className="block w-full" /></label><label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />{t('confirmExternalTransfer')}</label>{error && <p role="alert" className="rounded-xl border border-red-500 p-3">{error}</p>}<button type="submit" disabled={busy || !proof || !confirmed || !reference.trim()} className="w-full rounded-xl bg-blue-700 p-3 font-bold disabled:opacity-40">{busy ? t('working') : t('recordTransfer')}</button></form></StudioDialog></StudioOverlay>}
  </section>;
}
