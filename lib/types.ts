export type Role = "admin" | "affiliate" | "advertiser";

export type User = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  affiliate_id: number | null;
  advertiser_id: number | null;
  api_token: string | null;
  created_at: string;
};

export type Advertiser = {
  id: number;
  name: string;
  company: string;
  email: string;
  website: string;
  status: string;
  notes: string;
  postback_token: string;
  created_at: string;
};

export type Affiliate = {
  id: number;
  name: string;
  company: string;
  email: string;
  status: string;
  postback_url: string;
  notes: string;
  created_at: string;
};

export type Offer = {
  id: number;
  advertiser_id: number;
  name: string;
  description: string;
  preview_url: string;
  offer_url: string;
  model: string;
  currency: string;
  payout: number;
  revenue: number;
  status: string;
  visibility: string;
  country_mode: string;
  countries: string;
  devices: string;
  attribution_hours: number | null;
  schedule_days: string;
  schedule_start_hour: number | null;
  schedule_end_hour: number | null;
  daily_click_cap: number | null;
  daily_conversion_cap: number | null;
  daily_budget_cap: number | null;
  fallback_url: string;
  final_url: string;
  google_strict: number;
  external_id: string | null;
  sync_source_id: number | null;
  created_at: string;
  updated_at: string;
  advertiser_name?: string;
};

export type OfferGoal = {
  id: number;
  offer_id: number;
  name: string;
  payout: number;
  revenue: number;
  is_default: number;
};

export type OfferAccess = {
  id: number;
  offer_id: number;
  affiliate_id: number;
  status: string;
  custom_payout: number | null;
  custom_revenue: number | null;
  daily_click_cap: number | null;
  daily_conversion_cap: number | null;
  affiliate_name?: string;
  offer_name?: string;
};

export type TrackingLink = {
  id: number;
  code: string;
  offer_id: number;
  affiliate_id: number;
  created_at: string;
  offer_name?: string;
  affiliate_name?: string;
};

export type Click = {
  id: string;
  link_id: number | null;
  smart_link_id: number | null;
  offer_id: number;
  affiliate_id: number;
  ip: string;
  user_agent: string;
  country: string;
  device: string;
  os: string;
  referrer: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
  sub6: string;
  sub7: string;
  sub8: string;
  sub9: string;
  sub10: string;
  fraud_flag: number;
  fraud_reason: string;
  blocked_reason: string;
  destination: string;
  created_at: string;
  offer_name?: string;
  affiliate_name?: string;
};

export type Conversion = {
  id: number;
  click_id: string | null;
  offer_id: number;
  affiliate_id: number;
  goal_id: number | null;
  goal_name: string;
  payout: number;
  revenue: number;
  currency: string;
  status: string;
  reject_reason: string;
  txid: string;
  ip: string;
  payout_id: number | null;
  postback_status: string;
  created_at: string;
  offer_name?: string;
  affiliate_name?: string;
};

export type PostbackLog = {
  id: number;
  direction: string;
  click_id: string;
  conversion_id: number | null;
  url: string;
  status_code: number | null;
  body: string;
  ok: number;
  created_at: string;
};

export type SmartLink = {
  id: number;
  name: string;
  code: string;
  affiliate_id: number;
  sort_mode: string;
  status: string;
  fallback_url: string;
  created_at: string;
  affiliate_name?: string;
};

export type SmartLinkOffer = {
  id: number;
  smart_link_id: number;
  offer_id: number;
  weight: number;
  offer_name?: string;
};

export type SyncSource = {
  id: number;
  name: string;
  advertiser_id: number;
  endpoint_url: string;
  api_key: string;
  last_run_at: string | null;
  last_status: string;
  last_message: string;
  created_at: string;
  advertiser_name?: string;
};

export type Payout = {
  id: number;
  affiliate_id: number;
  period_start: string;
  period_end: string;
  amount: number;
  currency: string;
  status: string;
  notes: string;
  created_at: string;
  paid_at: string | null;
  affiliate_name?: string;
};

export type Hop = {
  url: string;
  status: number | null;
  location: string | null;
  ms: number;
  error?: string;
};

export type LinkTestResult = {
  ok: boolean;
  finalUrl: string;
  hops: Hop[];
  message: string;
  pausedOffer?: boolean;
};
