import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const API_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
  ? `http://${hostname}:8000/api`
  : '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach authentication token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Types

export type Character = {
  id: number;
  name: string;
  description?: string;
  theme_color?: string;
  image_url?: string;
  artist?: {
    id: number;
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
};

export type Artwork = {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  visibility_status: string;
  work_type: string;
  character?: Character;
  character_id?: number;
  artist?: {
    id: number;
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_artist: boolean;
  avatar_url?: string;
};

export type Order = {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'SKETCHING' | 'COLORING' | 'COMPLETED' | 'CANCELLED';
  agreed_price?: number;
  revision_quota: number;
  client_id: number;
  client_name?: string;
  artist_id: number;
  artist_name?: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
};

export type MilestoneInvoice = {
  id: number;
  order_id: number;
  title: string;
  amount: number;
  is_paid: boolean;
  slip_image_url?: string;
  created_at: string;
};

export type Revision = {
  id: number;
  order_id: number;
  client_feedback: string;
  is_addressed: boolean;
  created_at: string;
};

export type OrderFile = {
  id: number;
  order_id: number;
  filename: string;
  s3_key: string;
  is_watermarked: boolean;
  file_type: 'WIP' | 'FINAL' | 'REFERENCE';
  uploaded_at: string;
};

export type Message = {
  id: number;
  order_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
};

export type Bid = {
  id: number;
  auction_id: number;
  bidder_id: number;
  amount: number;
  created_at: string;
  bidder_name: string;
};

export type AuctionMessage = {
  id: number;
  auction_id: number;
  sender_id: number;
  sender_name: string;
  is_artist: boolean;
  content: string;
  created_at: string;
};

export type Auction = {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  auction_type: 'COMMISSION_SLOT' | 'ADOPTABLE';
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  starting_bid: number;
  bid_increment: number;
  auto_buy?: number;
  start_time: string;
  end_time: string;
  winner_id?: number;
  winner_name?: string;
  winning_bid?: number;
  created_at: string;
  bids?: Bid[];
  messages?: AuctionMessage[];
  artist?: {
    id: number;
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  full_name: string;
  facebook_id?: string;
  avatar_url?: string;
};

export type RevenueByPeriod = {
  period: string;
  revenue: number;
};

export type AnalyticsResponse = {
  revenue_data: RevenueByPeriod[];
  adoptable_revenue: number;
  commission_revenue: number;
  average_winning_bid: number;
  completed_orders_count?: number;
  total_clients_count?: number;
};

// API Endpoints

export const getCharacters = async () => {
  const response = await apiClient.get<Character[]>('/characters');
  return response.data;
};

export const getAdminCharacters = async () => {
  const response = await apiClient.get<Character[]>('/characters/admin');
  return response.data;
};

export const createCharacter = async (data: { name: string; description?: string; theme_color?: string; image?: File }) => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.theme_color) formData.append('theme_color', data.theme_color);
  if (data.image) formData.append('image', data.image);

  const response = await apiClient.post<Character>('/characters', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateCharacter = async (id: number, data: { name?: string; description?: string; theme_color?: string; image?: File }) => {
  const formData = new FormData();
  if (data.name !== undefined) formData.append('name', data.name);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.theme_color !== undefined) formData.append('theme_color', data.theme_color);
  if (data.image) formData.append('image', data.image);

  const response = await apiClient.put<Character>(`/characters/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteCharacter = async (id: number) => {
  const response = await apiClient.delete<{ message: string }>(`/characters/${id}`);
  return response.data;
};

// Portfolio
export const getPortfolio = async () => {
  const response = await apiClient.get<Artwork[]>('/portfolio');
  return response.data;
};

export const getPortfolioAdmin = async () => {
  const response = await apiClient.get<Artwork[]>('/portfolio/admin');
  return response.data;
};

export const createArtwork = async (data: { 
  title: string; 
  description?: string; 
  visibility_status: string; 
  work_type: string;
  character_id?: number | null;
  image: File;
}) => {
  const formData = new FormData();
  formData.append('title', data.title);
  if (data.description) formData.append('description', data.description);
  formData.append('visibility_status', data.visibility_status);
  formData.append('work_type', data.work_type);
  if (data.character_id) formData.append('character_id', data.character_id.toString());
  formData.append('image', data.image);

  const response = await apiClient.post<Artwork>('/portfolio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateArtwork = async (
  id: number,
  data: {
    title?: string;
    description?: string;
    visibility_status?: string;
    work_type?: string;
    character_id?: number | null;
  }
) => {
  const formData = new FormData();
  if (data.title !== undefined) formData.append('title', data.title);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.visibility_status !== undefined) formData.append('visibility_status', data.visibility_status);
  if (data.work_type !== undefined) formData.append('work_type', data.work_type);
  if (data.character_id !== undefined) formData.append('character_id', data.character_id === null ? '0' : data.character_id.toString());

  const response = await apiClient.put<Artwork>(`/portfolio/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteArtwork = async (id: number) => {
  const response = await apiClient.delete<{ message: string }>(`/portfolio/${id}`);
  return response.data;
};

// Auth
export const login = async (data: LoginCredentials) => {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
};

export const register = async (data: RegisterCredentials) => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

export const updateMe = async (data: { full_name?: string; avatar_url?: string }) => {
  const response = await apiClient.put<User>('/auth/me', data);
  return response.data;
};

export type SystemUser = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_artist: boolean;
  avatar_url?: string;
  created_at: string;
  artist_handle?: string;
};

export const getAllUsers = async () => {
  const response = await apiClient.get<SystemUser[]>('/auth/users');
  return response.data;
};

export const updateUserRole = async (userId: number, data: { is_admin?: boolean; is_artist?: boolean }) => {
  const response = await apiClient.put(`/auth/users/${userId}/role`, data);
  return response.data;
};

export const deleteUser = async (userId: number) => {
  const response = await apiClient.delete<{ message: string }>(`/auth/users/${userId}`);
  return response.data;
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ url: string }>('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getMyCollection = async () => {
  const response = await apiClient.get<any[]>('/auth/me/collection');
  return response.data;
};

// Orders
export const createOrder = async (data: { 
  title: string; 
  description: string; 
  artist_id: number;
  revision_quota?: number;
  start_date?: string;
  due_date?: string;
}) => {
  const response = await apiClient.post<Order>('/orders', data);
  return response.data;
};

export const getOrders = async () => {
  const response = await apiClient.get<Order[]>('/orders');
  return response.data;
};

export type PublicQueueSlot = {
  slot_number: number;
  order_id: number;
  status: string;
  stage: string;
  client_id: number;
  title: string;
  client_name: string;
  start_date?: string;
  due_date?: string;
  created_at?: string;
};

export const getPublicQueue = async () => {
  const response = await apiClient.get<PublicQueueSlot[]>('/public/queue');
  return response.data;
};

export const getOrderById = async (id: number) => {
  const response = await apiClient.get<Order>(`/orders/${id}`);
  return response.data;
};

export const updateOrder = async (id: number, data: { 
  status?: string; 
  agreed_price?: number; 
  revision_quota?: number;
  start_date?: string;
  due_date?: string;
}) => {
  const response = await apiClient.patch<Order>(`/orders/${id}`, data);
  return response.data;
};

// Invoices
export const getInvoices = async (orderId: number) => {
  const response = await apiClient.get<MilestoneInvoice[]>(`/orders/${orderId}/invoices`);
  return response.data;
};

export const createInvoice = async (orderId: number, data: { title: string; amount: number }) => {
  const response = await apiClient.post<MilestoneInvoice>(`/orders/${orderId}/invoices`, data);
  return response.data;
};

export const payInvoice = async (invoiceId: number, slipFile: File) => {
  const formData = new FormData();
  formData.append('slip', slipFile);
  const response = await apiClient.post<MilestoneInvoice>(`/invoices/${invoiceId}/pay`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const approveInvoice = async (invoiceId: number) => {
  const response = await apiClient.post<MilestoneInvoice>(`/invoices/${invoiceId}/approve`);
  return response.data;
};

// Revisions
export const getRevisions = async (orderId: number) => {
  const response = await apiClient.get<Revision[]>(`/orders/${orderId}/revisions`);
  return response.data;
};

export const requestRevision = async (orderId: number, clientFeedback: string) => {
  const response = await apiClient.post<Revision>(`/orders/${orderId}/revisions`, { client_feedback: clientFeedback });
  return response.data;
};

export const resolveRevision = async (revisionId: number) => {
  const response = await apiClient.post<Revision>(`/revisions/${revisionId}/resolve`);
  return response.data;
};

// Messages
export const getMessages = async (orderId: number) => {
  const response = await apiClient.get<Message[]>(`/orders/${orderId}/messages`);
  return response.data;
};

export const sendMessage = async (orderId: number, content: string) => {
  const response = await apiClient.post<Message>(`/orders/${orderId}/messages`, { content });
  return response.data;
};

// Files
export const getFiles = async (orderId: number) => {
  const response = await apiClient.get<OrderFile[]>(`/orders/${orderId}/files`);
  return response.data;
};

export const uploadOrderFile = async (orderId: number, fileType: 'WIP' | 'FINAL' | 'REFERENCE', file: File) => {
  const formData = new FormData();
  formData.append('file_type', fileType);
  formData.append('file', file);
  const response = await apiClient.post<OrderFile>(`/orders/${orderId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadOrderFile = async (orderId: number, fileId: number, filename: string) => {
  const response = await apiClient.get(`/orders/${orderId}/files/${fileId}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteOrderFile = async (orderId: number, fileId: number) => {
  const response = await apiClient.delete<{ message: string }>(`/orders/${orderId}/files/${fileId}`);
  return response.data;
};

// Auctions & Bidding
export const getAuctions = async () => {
  const { data } = await apiClient.get<Auction[]>('/auctions');
  return data;
};

export const getAdminAuctions = async () => {
  const { data } = await apiClient.get<Auction[]>('/auctions/admin');
  return data;
};

export const getAuctionById = async (id: number) => {
  const response = await apiClient.get<Auction>(`/auctions/${id}`);
  return response.data;
};

export const createAuction = async (data: {
  title: string;
  description: string;
  image_url?: string;
  auction_type: 'COMMISSION_SLOT' | 'ADOPTABLE';
  starting_bid: number;
  bid_increment: number;
  auto_buy?: number;
  start_time: string;
  end_time: string;
}) => {
  const response = await apiClient.post<Auction>('/auctions', data);
  return response.data;
};

export const uploadAuctionImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ image_url: string }>('/auctions/upload_image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const placeBid = async (auctionId: number, amount: number) => {
  const response = await apiClient.post<Auction>(`/auctions/${auctionId}/bid`, { amount });
  return response.data;
};

export const closeAuction = async (auctionId: number) => {
  const response = await apiClient.post<Auction>(`/auctions/${auctionId}/close`);
  return response.data;
};

export const updateAuction = async (id: number, data: { auto_buy?: number; title?: string; description?: string }) => {
  const response = await apiClient.patch<Auction>(`/auctions/${id}`, data);
  return response.data;
};

export const getAuctionMessages = async (auctionId: number) => {
  const response = await apiClient.get<AuctionMessage[]>(`/auctions/${auctionId}/messages`);
  return response.data;
};

export const sendAuctionMessage = async (auctionId: number, content: string) => {
  const response = await apiClient.post<AuctionMessage>(`/auctions/${auctionId}/messages`, { content });
  return response.data;
};

export const getCommissionStatus = async () => {
  const response = await apiClient.get<{ open: boolean }>('/commissions/status');
  return response.data;
};

export const updateCommissionStatus = async (open: boolean) => {
  const response = await apiClient.post<{ open: boolean }>('/commissions/status', { open });
  return response.data;
};

export interface HomepageTextSettings {
  hero_tag: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_subtitle: string;
  badge_1: string;
  badge_2: string;
  badge_3: string;
}

export const getHomepageText = async () => {
  const response = await apiClient.get<HomepageTextSettings>('/commissions/homepage_text');
  return response.data;
};

export const updateHomepageText = async (data: Partial<HomepageTextSettings>) => {
  const response = await apiClient.post<HomepageTextSettings>('/commissions/homepage_text', data);
  return response.data;
};

// Analytics
export const getAnalytics = async (period: string = 'month') => {
  const response = await apiClient.get<AnalyticsResponse>(`/analytics?period=${period}`);
  return response.data;
};

// Notifications
export const getNotifications = async (limit: number = 20) => {
  const response = await apiClient.get(`/notifications?limit=${limit}`);
  return response.data;
};

export const markNotificationAsRead = async (id: number) => {
  const response = await apiClient.post(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await apiClient.post('/notifications/read-all');
  return response.data;
};

export type ArtistRegisterPayload = {
  handle: string;
  display_name: string;
  tagline: string;
  bio: string;
  avatar_url?: string;
  banner_url?: string;
  styles: string[];
  starting_price: number;
  social_twitter?: string;
  social_pixiv?: string;
  social_discord?: string;
};

export const registerArtistProfile = async (payload: ArtistRegisterPayload) => {
  const response = await apiClient.post('/artists/register', payload);
  return response.data;
};

export const getMyArtistProfile = async () => {
  const response = await apiClient.get('/artists/me');
  return response.data;
};

export const updateArtistProfile = async (data: Partial<ArtistRegisterPayload> & { commission_status?: string }) => {
  const response = await apiClient.put('/artists/me', data);
  return response.data;
};

export const uploadProfileImage = async (imageType: 'avatar' | 'banner', file: File) => {
  const formData = new FormData();
  formData.append('image_type', imageType);
  formData.append('file', file);
  
  const response = await apiClient.post<{ url: string }>('/artists/me/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export type ArtistProfile = {
  id: number;
  handle: string;
  display_name: string;
  tagline: string;
  bio: string;
  avatar_url?: string;
  banner_url?: string;
  styles: string[];
  commission_status: string;
  rating: number;
  total_completed_orders: number;
  starting_price: number;
  is_verified: boolean;
  is_featured: boolean;
};

export const getArtists = async () => {
  const response = await apiClient.get<ArtistProfile[]>('/artists');
  return response.data;
};
