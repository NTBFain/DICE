'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import StudioDialog, { StudioOverlay } from '@/components/StudioDialog';
import SecureImage from '@/components/SecureImage';
import SecureReference from '@/components/SecureReference';
import { apiClient } from '@/lib/api';
import { getDownloadErrorMessage, getErrorMessage } from '@/lib/errorMessage';
import { parseApiDate } from '@/lib/apiDate';
import { formatSatang, type Ledger } from '@/lib/paymentApi';
import { getReceivingProfile, saveReceivingProfile, importReceivingQr, previewPayoutRequest, submitPayoutRequest,
  listPayoutRequests, getPayoutRequest, actOnPayoutRequest, recordRequestedTransfer,
  type RequestPreview, type RequestAction } from '@/lib/payoutRequestApi';

const input = 'block w-full min-w-0 rounded-xl border border-neutral-500 bg-transparent p-3';
const button = 'rounded-xl border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40';
const primary = `${button} bg-blue-700 text-white`;

export default function PayoutRequestsPanel({admin, ledger}: {admin: boolean; ledger: Ledger}) {
  return <Suspense fallback={null}><RequestPanel admin={admin} ledger={ledger} /></Suspense>;
}

function RequestPanel({admin, ledger}: {admin: boolean; ledger: Ledger}) {
  const t = useTranslations('PayoutRequests'); const locale = useLocale(); const {user} = useAuth();
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const linkedRequest = searchParams.get('request');
  const cache = useQueryClient(); const lock = useRef(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [offset, setOffset] = useState(0); const [detailId, setDetailId] = useState<number | null>(null);
  const [name, setName] = useState(''); const [mobile, setMobile] = useState(''); const [profileVersion, setProfileVersion] = useState(0);
  const [selected, setSelected] = useState<number[]>([]); const [preview, setPreview] = useState<RequestPreview | null>(null);
  const [requestKey, setRequestKey] = useState(''); const [action, setAction] = useState<RequestAction | 'transfer' | null>(null);
  const [note, setNote] = useState(''); const [noTransfer, setNoTransfer] = useState(false);
  const [reference, setReference] = useState(''); const [proof, setProof] = useState<File | null>(null); const [transferred, setTransferred] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const profile = useQuery({queryKey: ['payout-profile', user?.id], queryFn: getReceivingProfile, enabled: !admin && !!user?.is_artist, retry: false, refetchOnWindowFocus: false});
  const requests = useQuery({queryKey: ['payout-requests', user?.id, offset], queryFn: () => listPayoutRequests(offset), retry: false});
  const detail = useQuery({queryKey: ['payout-request', user?.id, detailId], queryFn: () => getPayoutRequest(detailId!), enabled: detailId !== null, retry: false});
  const money = (value: number) => formatSatang(value, locale);
  const date = (value: string) => parseApiDate(value).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US');
  useEffect(() => {
    if (profile.data) {setName(profile.data.account_holder_name); setMobile(profile.data.mobile_number); setProfileVersion(profile.data.version);}
  }, [profile.data]);
  useEffect(() => {
    const id = Number(linkedRequest);
    setDetailId(Number.isSafeInteger(id) && id > 0 ? id : null);
    setAction(null); setShowQr(false); setError('');
  }, [linkedRequest]);
  async function refresh() {
    await Promise.all([cache.invalidateQueries({queryKey: ['payment-ledger']}), cache.invalidateQueries({queryKey: ['payout-requests']}), cache.invalidateQueries({queryKey: ['payout-request']})]);
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {await work();} catch (error) {setError(getErrorMessage(error, t('failed')));}
    finally {lock.current = false; setBusy(false);}
  }
  function requestUrl(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) params.delete('request'); else params.set('request', String(id));
    const query = params.toString();
    router.replace(pathname + (query ? `?${query}` : ''), {scroll: false});
  }
  function openDetail(id: number) {setDetailId(id); setAction(null); setShowQr(false); setError(''); setNotice(''); requestUrl(id);}
  function closeDetail() {if (!busy) {setDetailId(null); setError(''); requestUrl(null);}}
  function chooseAction(value: RequestAction | 'transfer') {
    setAction(value); setNote(''); setNoTransfer(false); setReference(''); setProof(null); setTransferred(false); setError('');
  }
  async function downloadQr() {
    await run(async () => {
      try {
        const response = await apiClient.get(`/payments/payout-requests/${detailId}/qr`, {responseType: 'blob'});
        const url = URL.createObjectURL(response.data); const link = document.createElement('a');
        link.href = url; link.download = `DICE-artist-payout-${detailId}.png`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {throw new Error(await getDownloadErrorMessage(error, t('failed')));}
    });
  }
  const request = detail.data;
  const isClaimant = request?.claimed_by === user?.id;
  const reasonRequired = action === 'release' || action === 'reject' || action === 'problem' || action === 'note';
  const totals = (data: {gross_satang: number; fee_satang: number; net_satang: number}) => <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">{(['gross','fee','net'] as const).map(label => <div key={label}><dt>{t(label)}</dt><dd className="font-bold">{money(data[`${label}_satang`])}</dd></div>)}</dl>;
  return <section className="space-y-5 border-t border-neutral-600 pt-5" aria-label={t('title')}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{admin ? t('queue') : t('title')}</h3><button type="button" disabled={busy} className={button} onClick={() => void run(refresh)}>{t('refresh')}</button></div>
    <p className="text-sm">{t('explanation')}</p>
    <p className="rounded-xl border border-blue-500 p-3 text-sm"><strong>{t('distinction')}</strong></p>
    {notice && <p role="status" className="rounded-xl border border-emerald-500 p-3">{notice}</p>}
    {error && !preview && detailId === null && <p role="alert" className="rounded-xl border border-red-500 p-3">{error}</p>}
    {!admin && user?.is_artist && <>
      <form className="space-y-3 rounded-xl border border-neutral-600 p-4" onSubmit={event => {event.preventDefault(); void run(async () => {
        const saved = await saveReceivingProfile({account_holder_name: name, mobile_number: mobile, version: profileVersion});
        cache.setQueryData(['payout-profile', user?.id], saved); setProfileVersion(saved.version); setMobile(saved.mobile_number); setNotice(t('detailsSaved'));
      });}}>
        <h4 className="font-bold">{t('details')}</h4><p className="text-sm">{t('detailsWarning')}</p>
        {profile.isPending ? <p role="status">{t('working')}</p> : profile.isError ? <p role="alert">{t('failed')} <button type="button" className={button} onClick={() => profile.refetch()}>{t('retry')}</button></p> : <>
          <div className="grid gap-3 sm:grid-cols-2"><label>{t('holder')}<input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} autoComplete="name" className={input} /></label><label>{t('mobile')}<input required type="tel" maxLength={30} value={mobile} disabled={busy} onChange={event => setMobile(event.target.value)} autoComplete="tel" className={input} /></label></div>
          <label className="block text-sm">{t('importQr')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full" onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void run(async () => {const parsed = await importReceivingQr(file); setMobile(parsed.mobile_number); setNotice(t('imported'));});
          }} /></label><button type="submit" disabled={busy || !name.trim() || !mobile.trim()} className={button}>{t('saveDetails')}</button>
        </>}
      </form>
      <div className="space-y-3"><h4 className="font-bold">{t('eligibleOrders')}</h4><p className="text-sm">{t('eligibility')}</p>
        {ledger.orders.filter(row => row.status === 'ELIGIBLE').map(row => <label key={row.order_id} className="flex items-start gap-3 rounded-xl border border-neutral-600 p-3"><input type="checkbox" disabled={busy} checked={selected.includes(row.order_id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.order_id] : current.filter(id => id !== row.order_id))} className="mt-1 h-5 w-5 shrink-0" /><span className="min-w-0 break-words">#{row.order_id} {row.title}<br />{t('gross')} {money(row.gross_satang)} · {t('fee')} {(row.fee_bps / 100).toFixed(2)}% ({money(row.fee_satang)}) · <strong>{t('net')} {money(row.net_satang)}</strong></span></label>)}
        {!ledger.orders.some(row => row.status === 'ELIGIBLE') && <p>{t('noneEligible')}</p>}
        <button type="button" disabled={busy || !profile.data || !selected.length} className={primary} onClick={() => void run(async () => {
          setPreview(await previewPayoutRequest(selected)); setRequestKey(crypto.randomUUID());
        })}>{t('request')} ({selected.length})</button>
      </div>
    </>}
    <h4 className="font-bold">{t('history')}</h4>
    {requests.isPending && <p role="status">{t('working')}</p>}
    {requests.isError && <p role="alert">{t('failed')} <button type="button" className={button} onClick={() => requests.refetch()}>{t('retry')}</button></p>}
    {requests.data && !requests.data.items.length && <p>{t('noRequests')}</p>}
    <div className="grid gap-3 lg:grid-cols-2">{requests.data?.items.map(row => <article key={row.id} className="space-y-2 rounded-xl border border-neutral-600 p-4"><h5 className="font-bold">#{row.id} · {money(row.net_satang)}</h5>{admin && <p>{row.artist_name}</p>}<p className="break-words">{row.account_holder_name} · {row.mobile_masked}</p><p><strong>{t(`states.${row.status}`)}</strong></p>{row.status === 'TRANSFER_RECORDED' && <p><strong>{t(`receipts.${row.receipt_status}`)}</strong></p>}<p className="text-sm">{date(row.created_at)}</p><button type="button" className={button} onClick={() => openDetail(row.id)}>{t('view')}</button></article>)}</div>
    {requests.data && requests.data.total > 20 && <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy || offset === 0} className={button} onClick={() => setOffset(Math.max(0, offset - 20))}>{t('previous')}</button><span>{offset + 1}–{Math.min(offset + 20, requests.data.total)} / {requests.data.total}</span><button type="button" disabled={busy || offset + 20 >= requests.data.total} className={button} onClick={() => setOffset(offset + 20)}>{t('next')}</button></div>}
    {preview && <StudioOverlay className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"><StudioDialog label={t('review')} onClose={() => {if (!busy) setPreview(null);}} className="max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-neutral-950 p-5 text-white">
      <div className="flex justify-between gap-3"><h3 className="text-xl font-bold">{t('review')}</h3><button type="button" disabled={busy} className={button} onClick={() => setPreview(null)} aria-label={t('close')}>×</button></div>
      <p className="break-words">{t('holder')}: <strong>{preview.account_holder_name}</strong><br />{t('mobile')}: {preview.mobile_number}</p>
      <ul className="space-y-2">{preview.items.map(row => <li key={row.order_id}>#{row.order_id} {row.title} · {t('fee')} {(row.fee_bps / 100).toFixed(2)}% · {t('net')} {money(row.net_satang)}</li>)}</ul>
      {totals(preview)}<p className="rounded-xl border border-amber-500 p-3">{t('freezeWarning')}</p><p><strong>{t('requestOnly')}</strong></p>
      {error && <p role="alert">{error}</p>}<button type="button" disabled={busy} className={primary} onClick={() => void run(async () => {
        const created = await submitPayoutRequest(preview, requestKey); setPreview(null); setSelected([]); openDetail(created.id); setNotice(t('submitted')); await refresh();
      })}>{busy ? t('working') : t('submit')}</button>
    </StudioDialog></StudioOverlay>}
    {detailId !== null && <StudioOverlay className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"><StudioDialog label={t('requestNumber', {id: detailId})} onClose={closeDetail} className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-neutral-950 p-5 text-white">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl font-bold">{t('requestNumber', {id: detailId})}</h3><div className="flex gap-2"><button type="button" disabled={busy} className={button} onClick={() => void detail.refetch()}>{t('refresh')}</button><button type="button" disabled={busy} className={button} onClick={closeDetail} aria-label={t('close')}>×</button></div></div>
      {detail.isPending && <p role="status">{t('working')}</p>}
      {detail.isError && <p role="alert">{t('failed')} <button type="button" className={button} onClick={() => detail.refetch()}>{t('retry')}</button></p>}
      {request && <>
        <p><strong>{t(`states.${request.status}`)}</strong></p>{request.status === 'TRANSFER_RECORDED' && <p><strong>{t(`receipts.${request.receipt_status}`)}</strong></p>}
        {request.refund_hold && <p role="alert" className="rounded-xl border border-amber-500 p-3">{t(request.payout_id ? 'refundReview' : 'refundHold')}</p>}
        <p className="break-words">{request.artist_name}<br />{t('holder')}: <strong>{request.account_holder_name}</strong><br />{t('mobile')}: {request.mobile_number}</p>
        {totals(request)}<p className="text-sm">{t('frozenDetails')}</p>
        <ul className="space-y-2">{request.items?.map(row => <li key={row.order_id}>#{row.order_id} {row.title} · {t('gross')} {money(row.gross_satang)} · {t('fee')} {(row.fee_bps / 100).toFixed(2)}% ({money(row.fee_satang)}) · {t('net')} {money(row.net_satang)}</li>)}</ul>
        {request.claimed_by && <p>{t('claimant', {id: request.claimed_by})}</p>}
        <div className="flex flex-wrap gap-2">
          {admin && request.status === 'REQUESTED' && <><button type="button" disabled={busy || request.refund_hold} className={primary} onClick={() => chooseAction('claim')}>{t('actions.claim')}</button><button type="button" disabled={busy} className={button} onClick={() => chooseAction('reject')}>{t('actions.reject')}</button></>}
          {!admin && user?.is_artist && request.artist_id === user.id && request.status === 'REQUESTED' && <button type="button" disabled={busy} className={button} onClick={() => chooseAction('cancel')}>{t('actions.cancel')}</button>}
          {admin && request.status === 'PROCESSING' && isClaimant && <><button type="button" disabled={busy || request.refund_hold} className={button} onClick={() => setShowQr(current => !current)}>{t('showQr')}</button><button type="button" disabled={busy || request.refund_hold} className={primary} onClick={() => chooseAction('transfer')}>{t('actions.transfer')}</button><button type="button" disabled={busy} className={button} onClick={() => chooseAction('release')}>{t('actions.release')}</button></>}
          {!admin && user?.is_artist && request.artist_id === user.id && request.status === 'TRANSFER_RECORDED' && request.receipt_status !== 'CONFIRMED' && <><button type="button" disabled={busy} className={primary} onClick={() => chooseAction('confirm')}>{t('actions.confirm')}</button>{request.receipt_status === 'PENDING' && <button type="button" disabled={busy} className={button} onClick={() => chooseAction('problem')}>{t('actions.problem')}</button>}</>}
          {admin && request.status === 'TRANSFER_RECORDED' && request.receipt_status === 'ISSUE_REPORTED' && <button type="button" disabled={busy} className={button} onClick={() => chooseAction('note')}>{t('actions.note')}</button>}
        </div>
        {showQr && admin && request.status === 'PROCESSING' && isClaimant && !request.refund_hold && <div className="space-y-3 rounded-xl border border-amber-500 p-3"><p>{t('qrWarning')}</p><SecureImage src={`/api/payments/payout-requests/${request.id}/qr`} alt={t('transferQr')} className="mx-auto h-auto w-64 max-w-full bg-white" /><button type="button" disabled={busy} className={button} onClick={() => void downloadQr()}>{t('downloadQr')}</button></div>}
        {action && !(request.refund_hold && (action === 'claim' || action === 'transfer')) && <form className="space-y-3 rounded-xl border border-blue-500 p-4" onSubmit={event => {event.preventDefault(); void run(async () => {
          if (action === 'transfer') {if (!proof || !transferred) return; await recordRequestedTransfer(request, reference, proof);}
          else await actOnPayoutRequest(request, action, note, noTransfer);
          setAction(null); setProof(null); setShowQr(false); await refresh(); setNotice(t('updated'));
        });}}>
          <h4 className="font-bold">{t(`actions.${action}`)}</h4><p className="text-sm">{t(`actionHelp.${action}`)}</p>
          {action === 'transfer' ? <><label className="block">{t('reference')}<input required maxLength={200} disabled={busy} value={reference} onChange={event => setReference(event.target.value)} className={input} /></label><label className="block">{t('proof')}<input type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy} onChange={event => setProof(event.target.files?.[0] || null)} className="mt-2 block w-full" /></label><label className="flex items-start gap-3"><input type="checkbox" required checked={transferred} disabled={busy} onChange={event => setTransferred(event.target.checked)} className="mt-1" />{t('transferConfirmation')}</label></> : <>
            {reasonRequired && <label className="block">{t('reason')}<textarea required maxLength={2000} rows={3} disabled={busy} value={note} onChange={event => setNote(event.target.value)} className={input} /></label>}
            {action === 'release' && <label className="flex items-start gap-3"><input required type="checkbox" checked={noTransfer} disabled={busy} onChange={event => setNoTransfer(event.target.checked)} className="mt-1" />{t('noTransfer')}</label>}
          </>}
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy || (reasonRequired && !note.trim()) || (action === 'release' && !noTransfer) || (action === 'transfer' && (!transferred || !proof || !reference.trim()))} className={primary}>{busy ? t('working') : t(`actions.${action}`)}</button><button type="button" disabled={busy} className={button} onClick={() => setAction(null)}>{t('back')}</button></div>
        </form>}
        {request.payout && <div className="space-y-2"><h4 className="font-bold">{t('transferEvidence')}</h4><p className="break-words">{t('reference')}: {request.payout.transfer_reference}</p><p>{date(request.payout.created_at)}</p><div className="w-32"><SecureReference src={request.payout.proof_url} title={t('proof')} openLabel={t('viewProof')} /></div></div>}
        <h4 className="font-bold">{t('audit')}</h4><ol className="space-y-3">{request.events?.map(event => <li key={event.id} className="rounded-xl border border-neutral-600 p-3"><strong>{t(`events.${event.action}`)}</strong><p className="text-sm">{date(event.created_at)} · {t('actor', {id: event.actor_id})}</p>{event.note && <p className="whitespace-pre-wrap break-words">{event.note}</p>}</li>)}</ol>
      </>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="rounded-xl border border-red-500 p-3">{error}</p>}
    </StudioDialog></StudioOverlay>}
  </section>;
}
