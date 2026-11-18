import { apiClient } from './api';
import type { Payout, PayoutQuote } from './paymentApi';

export type ReceivingProfile = {artist_id?: number; account_holder_name: string; mobile_number: string; version: number};
export type RequestPreview = PayoutQuote & {profile_version: number; account_holder_name: string; mobile_number: string};
export type PayoutRequest = {
  id: number; artist_id: number; artist_name: string; account_holder_name: string; mobile_masked: string;
  mobile_number?: string; profile_version: number; gross_satang: number; fee_satang: number; net_satang: number;
  status: 'REQUESTED' | 'PROCESSING' | 'TRANSFER_RECORDED' | 'CANCELLED' | 'REJECTED';
  receipt_status: 'PENDING' | 'CONFIRMED' | 'ISSUE_REPORTED'; version: number; claimed_by: number | null;
  payout_id: number | null; created_at: string; updated_at: string;
  items?: {order_id: number; title: string; gross_satang: number; fee_bps: number; fee_satang: number; net_satang: number}[];
  events?: {id: number; actor_id: number; action: string; note: string; version: number; created_at: string}[];
  payout?: Payout | null;
};
export type RequestAction = 'claim' | 'release' | 'cancel' | 'reject' | 'confirm' | 'problem' | 'note';
export const getReceivingProfile = async () => (await apiClient.get<ReceivingProfile | null>('/payments/receiving-profile')).data;
export const saveReceivingProfile = async (profile: ReceivingProfile) => (await apiClient.put<ReceivingProfile>('/payments/receiving-profile', {
  account_holder_name: profile.account_holder_name, mobile_number: profile.mobile_number, version: profile.version,
})).data;
export const importReceivingQr = async (file: File) => {
  const form = new FormData(); form.append('qr', file);
  return (await apiClient.post<{mobile_number: string}>('/payments/receiving-profile/import-qr', form, {headers: {'Content-Type': 'multipart/form-data'}})).data;
};
export const previewPayoutRequest = async (orderIds: number[]) => (await apiClient.post<RequestPreview>('/payments/payout-requests/preview', {order_ids: orderIds})).data;
export const submitPayoutRequest = async (quote: RequestPreview, key: string) => (await apiClient.post<PayoutRequest>('/payments/payout-requests', {
  order_ids: quote.items.map(row => row.order_id), quote_digest: quote.quote_digest, profile_version: quote.profile_version, idempotency_key: key,
})).data;
export const listPayoutRequests = async (offset: number) => (await apiClient.get<{items: PayoutRequest[]; total: number}>('/payments/payout-requests', {params: {offset, limit: 20}})).data;
export const getPayoutRequest = async (id: number) => (await apiClient.get<PayoutRequest>(`/payments/payout-requests/${id}`)).data;
export const actOnPayoutRequest = async (request: PayoutRequest, action: RequestAction, note: string, noTransfer: boolean) =>
  (await apiClient.post<PayoutRequest>(`/payments/payout-requests/${request.id}/actions/${action}`, {version: request.version, note, no_transfer_made: noTransfer})).data;
export const recordRequestedTransfer = async (request: PayoutRequest, reference: string, proof: File) => {
  const form = new FormData(); form.append('version', String(request.version)); form.append('transfer_reference', reference); form.append('proof', proof);
  return (await apiClient.post<PayoutRequest>(`/payments/payout-requests/${request.id}/transfer`, form, {headers: {'Content-Type': 'multipart/form-data'}})).data;
};
