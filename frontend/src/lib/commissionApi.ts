import { apiClient } from './api';
import {
  ArtistCommissionInfo,
  CommissionPolicy,
  CommissionServiceDetail,
  CommissionRequest,
  ServiceAddon,
  CommissionRequestStatus,
  FormBlock
} from '../types/commission';

// 1. Fetch public artist commission catalog, policy, and services
export const getArtistCommissionInfo = async (handle: string): Promise<ArtistCommissionInfo> => {
  const res = await apiClient.get<ArtistCommissionInfo>(`/artists/${handle}/commission-info`);
  return res.data;
};

// 2. Artist policy updates
export const updateCommissionPolicy = async (policy: Partial<CommissionPolicy>): Promise<CommissionPolicy> => {
  const res = await apiClient.put<CommissionPolicy>('/artists/me/commission-policy', policy);
  return res.data;
};

// 3. Service availability & slot toggles
export const updateServiceAvailability = async (
  serviceId: number,
  isFormOpen: boolean,
  notifyFollowers: boolean = true
): Promise<CommissionServiceDetail> => {
  const res = await apiClient.patch<CommissionServiceDetail>(
    `/artists/me/services/${serviceId}/availability`,
    { is_form_open: isFormOpen, notify_followers: notifyFollowers }
  );
  return res.data;
};

// 4. Update service scale settings
export const updateServiceScale = async (
  serviceId: number,
  data: Partial<CommissionServiceDetail>
): Promise<CommissionServiceDetail> => {
  const res = await apiClient.patch<CommissionServiceDetail>(`/artists/me/services/${serviceId}`, data);
  return res.data;
};

// 5. Addon CRUD
export const addServiceAddon = async (
  serviceId: number,
  data: { name: string; price_type: 'FIXED' | 'PERCENTAGE'; price_value: number }
): Promise<ServiceAddon> => {
  const res = await apiClient.post<ServiceAddon>(`/artists/me/services/${serviceId}/addons`, data);
  return res.data;
};

export const updateServiceAddon = async (
  serviceId: number,
  addonId: number,
  data: Partial<ServiceAddon>
): Promise<ServiceAddon> => {
  const res = await apiClient.patch<ServiceAddon>(`/artists/me/services/${serviceId}/addons/${addonId}`, data);
  return res.data;
};

export const deleteServiceAddon = async (
  serviceId: number,
  addonId: number
): Promise<{ message: string }> => {
  const res = await apiClient.delete<{ message: string }>(`/artists/me/services/${serviceId}/addons/${addonId}`);
  return res.data;
};

// 6. Submit commission request
export const submitCommissionRequest = async (formData: FormData): Promise<CommissionRequest> => {
  const res = await apiClient.post<CommissionRequest>('/commissions/requests', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// 7. Get requests
export const getIncomingCommissionRequests = async (status?: CommissionRequestStatus): Promise<CommissionRequest[]> => {
  const params = status ? { status } : {};
  const res = await apiClient.get<CommissionRequest[]>('/commissions/requests/incoming', { params });
  return res.data;
};

export const getMyCommissionRequests = async (): Promise<CommissionRequest[]> => {
  const res = await apiClient.get<CommissionRequest[]>('/commissions/requests/mine');
  return res.data;
};

export const getCommissionRequestDetail = async (requestId: number): Promise<CommissionRequest> => {
  const res = await apiClient.get<CommissionRequest>(`/commissions/requests/${requestId}`);
  return res.data;
};

// 8. Request actions
export const acceptCommissionRequest = async (requestId: number): Promise<CommissionRequest> => {
  const res = await apiClient.post<CommissionRequest>(`/commissions/requests/${requestId}/accept`);
  return res.data;
};

export const declineCommissionRequest = async (requestId: number, reason: string): Promise<CommissionRequest> => {
  const res = await apiClient.post<CommissionRequest>(`/commissions/requests/${requestId}/decline`, { reason });
  return res.data;
};

export const withdrawCommissionRequest = async (requestId: number): Promise<CommissionRequest> => {
  const res = await apiClient.post<CommissionRequest>(`/commissions/requests/${requestId}/withdraw`);
  return res.data;
};

// 9. Slot subscriptions (Bell)
export const toggleSlotSubscription = async (artistId: number, serviceId?: number): Promise<{ is_active: boolean }> => {
  const res = await apiClient.post<{ is_active: boolean }>('/commissions/subscriptions', {
    artist_id: artistId,
    service_id: serviceId,
  });
  return res.data;
};

export const checkSlotSubscriptionStatus = async (artistId: number, serviceId?: number): Promise<{ is_subscribed: boolean }> => {
  const params: { artist_id: number; service_id?: number } = { artist_id: artistId };
  if (serviceId) params.service_id = serviceId;
  const res = await apiClient.get<{ is_subscribed: boolean }>('/commissions/subscriptions/status', { params });
  return res.data;
};

// 10. Service Scale CRUD
export interface CreateServicePayload {
  title: string;
  category: string;
  description: string;
  base_price: number;
  estimated_days: number;
  max_slots?: number;
  is_form_open?: boolean;
  auto_close_on_full?: boolean;
}

export const createArtistService = async (payload: CreateServicePayload): Promise<any> => {
  const res = await apiClient.post('/artists/me/services', payload);
  return res.data;
};

export const deleteArtistService = async (serviceId: number): Promise<{ message: string }> => {
  const res = await apiClient.delete<{ message: string }>(`/artists/me/services/${serviceId}`);
  return res.data;
};

// 11. Update Modular Form Schema
export const updateServiceFormSchema = async (
  serviceId: number,
  blocks: FormBlock[]
): Promise<{ message: string; form_schema: FormBlock[] }> => {
  const res = await apiClient.put<{ message: string; form_schema: FormBlock[] }>(
    `/artists/me/services/${serviceId}/form-schema`,
    { blocks }
  );
  return res.data;
};
