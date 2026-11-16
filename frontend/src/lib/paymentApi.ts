import { apiClient } from './api';

export type PaymentSettings = {enabled: boolean; recipient_name: string; mobile_number: string; fee_bps: number; version: number};
export type PaymentInstruction = {id: number; invoice_id: number; recipient_name: string; mobile_number: string; amount_satang: number; settings_version: number; qr_url: string; approval_method: 'MANUAL'};
export type SettlementRow = {order_id: number; artist_id: number; artist_name: string; title: string; status: string; gross_satang: number; fee_bps: number; fee_satang: number; net_satang: number; fingerprint: string};
export type Payout = {id: number; artist_id: number; recorded_by: number; transfer_reference: string; gross_satang: number; fee_satang: number; net_satang: number; proof_url: string; created_at: string; items: SettlementRow[]};
export type Ledger = {orders: SettlementRow[]; payouts: Payout[]; approved_invoice_gross_satang: number; platform_collections_satang: number; eligible_net_satang: number; recorded_payout_net_satang: number};
export type PayoutQuote = {artist_id: number; items: SettlementRow[]; gross_satang: number; fee_satang: number; net_satang: number; quote_digest: string};

export const getPaymentSettings = async () => (await apiClient.get<PaymentSettings>('/payments/settings')).data;
export const savePaymentSettings = async (settings: PaymentSettings) => (await apiClient.put<PaymentSettings>('/payments/settings', settings)).data;
export const importPromptPayQr = async (file: File) => {
  const form = new FormData(); form.append('qr', file);
  return (await apiClient.post<{mobile_number: string; saved: false}>('/payments/settings/import-qr', form, {headers: {'Content-Type': 'multipart/form-data'}})).data;
};
export const createPaymentInstruction = async (invoiceId: number) => (await apiClient.post<PaymentInstruction>(`/payments/invoices/${invoiceId}/instruction`)).data;
export const getLedger = async () => (await apiClient.get<Ledger>('/payments/ledger')).data;
export const quotePayout = async (artistId: number, orderIds: number[]) => (await apiClient.post<PayoutQuote>('/payments/payouts/quote', {artist_id: artistId, order_ids: orderIds})).data;
export const recordPayout = async (quote: PayoutQuote, reference: string, proof: File, key: string) => {
  const form = new FormData();
  form.append('selection', JSON.stringify({artist_id: quote.artist_id, order_ids: quote.items.map(row => row.order_id)}));
  form.append('quote_digest', quote.quote_digest); form.append('transfer_reference', reference);
  form.append('idempotency_key', key); form.append('proof', proof);
  return (await apiClient.post<Payout>('/payments/payouts', form, {headers: {'Content-Type': 'multipart/form-data'}})).data;
};
export const formatSatang = (value: number, locale: string) => new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {style: 'currency', currency: 'THB', minimumFractionDigits: 2}).format(value / 100);
