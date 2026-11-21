'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessage';

export default function ProviderPromptPayButton({invoiceId}: {invoiceId: number}) {
  const t = useTranslations('Payments');
  const locale = useLocale();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const {data} = await apiClient.post<{url: string}>(`/payments/invoices/${invoiceId}/checkout`, undefined, {
        params: {locale},
      });
      const url = new URL(data.url);
      if (url.origin !== 'https://checkout.stripe.com') throw new Error(t('unavailable'));
      window.location.assign(url.href);
    } catch (error) {
      setError(getErrorMessage(error, t('unavailable')));
      setBusy(false);
      pending.current = false;
    }
  }

  return <div className="space-y-2">
    <p className="text-sm">{t('automaticConfirmation')}</p>
    <button type="button" disabled={busy} onClick={() => void pay()}
      className="rounded-xl bg-blue-700 px-4 py-3 font-bold disabled:opacity-50">
      {t(busy ? 'working' : 'payWithPromptPay')}
    </button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
