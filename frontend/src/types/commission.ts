export type AddonPriceType = 'FIXED' | 'PERCENTAGE';
export type CommissionRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type EffectiveSlotStatus = 'OPEN' | 'FULL' | 'WAITLIST' | 'CLOSED';

export interface ServiceAddon {
  id: number;
  service_id: number;
  name: string;
  price_type: AddonPriceType;
  price_value: number;
  is_active: boolean;
  created_at: string;
}

export interface CommissionPolicy {
  id: number;
  artist_id: number;
  terms_of_service: string;
  refund_policy: string;
  ai_policy: string;
  will_draw: string[];
  wont_draw: string[];
  deposit_percent: number;
  default_revision_quota: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export type FormBlockType = 
  | 'CHARACTER_COUNT' 
  | 'SCOPE_EXCLUSIONS' 
  | 'POSE_EXPRESSION' 
  | 'CANVAS_SPECS' 
  | 'BACKGROUND_TIER' 
  | 'RUSH_MODE' 
  | 'PRIVACY_NDA' 
  | 'CUSTOM_QUESTIONS';

export interface FormBlock {
  id: string;
  type: FormBlockType;
  enabled: boolean;
  title?: string;
  description?: string;
  config: Record<string, any>;
}

export interface CommissionServiceDetail {
  id: number;
  artist_id: number;
  title: string;
  category: string;
  description: string;
  base_price: number;
  estimated_days: number;
  includes_commercial: boolean;
  includes_psd: boolean;
  sample_image_url: string | null;
  max_slots: number;
  is_form_open: boolean;
  auto_close_on_full: boolean;
  sort_order: number;
  used_slots: number;
  effective_status: EffectiveSlotStatus;
  addons: ServiceAddon[];
  form_schema?: FormBlock[];
}

export interface ArtistCommissionInfo {
  artist_id: number;
  artist_user_id?: number;
  handle: string;
  display_name: string;
  commission_status: 'OPEN' | 'CLOSED' | 'WAITLIST';
  policy: CommissionPolicy | null;
  services: CommissionServiceDetail[];
  is_subscribed: boolean;
}

export interface CommissionRequest {
  id: number;
  service_id: number;
  service_title?: string;
  client_id: number;
  client_name?: string;
  client_email?: string;
  artist_user_id: number;
  status: CommissionRequestStatus;
  character_name: string;
  usage_type: string;
  brief: string;
  canvas_size: string;
  requested_deadline?: string | null;
  reference_links?: string | null;
  reference_images: string[];
  addons_snapshot: {
    id: number;
    name: string;
    price_type: AddonPriceType;
    price_value: number;
  }[];
  custom_responses?: Record<string, any>;
  base_price_snapshot: number;
  total_price: number;
  tos_snapshot: string;
  tos_version: number;
  decline_reason?: string | null;
  order_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRequestCreatePayload {
  service_id: number;
  character_name: string;
  usage_type: string;
  brief: string;
  canvas_size: string;
  requested_deadline?: string | null;
  reference_links?: string | null;
  addon_ids: number[];
  custom_responses?: Record<string, any>;
  agreed_to_tos: boolean;
}
