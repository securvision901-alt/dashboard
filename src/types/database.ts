// Database row types — mirrors the admin portal schema.

export type Artist = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_media_id: string | null;
  is_own_artist: boolean;
  active: boolean;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  artist_id: string | null;
  kind: string;
  label: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  created_at: string;
};

export type Release = {
  id: string;
  artist_id: string | null;
  title: string;
  type: string;
  release_date: string | null;
  cover_media_id: string | null;
  status: string;
  catalog_number: string | null;
  upc: string | null;
  price_cents: number;
  is_free: boolean;
  genre: string | null;
  explicit: boolean;
  created_at: string;
  updated_at: string;
};

export type Track = {
  id: string;
  release_id: string;
  title: string;
  position: number;
  duration_seconds: number | null;
  isrc: string | null;
  isrc_explicit: boolean;
  audio_media_id: string | null;
  audio_storage_path: string | null;
  preview_seconds: number;
  is_preview_enabled: boolean;
  is_free: boolean;
  download_allowed: boolean;
  price_cents: number;
  status: string;
  created_at: string;
};

export type DistributionSubmission = {
  id: string;
  release_id: string;
  platform_connection_id: string | null;
  status: string;
  submitted_at: string | null;
  response: string | null;
  created_at: string;
};

export type Fan = {
  id: string;
  email: string;
  name: string | null;
  subscribed: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  fan_id: string | null;
  amount_total_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  release_id: string | null;
  track_id: string | null;
  product_type: string;
  label: string | null;
  amount_cents: number;
  quantity: number;
  created_at: string;
};

export type Booking = {
  id: string;
  artist_id: string | null;
  inquiry_id: string | null;
  event_name: string;
  venue_name: string;
  crm_contact_id: string | null;
  event_date: string;
  event_type: string | null;
  status: string;
  fee_cents: number;
  deposit_cents: number | null;
  deposit_due_date: string | null;
  balance_due_date: string | null;
  set_length_minutes: number | null;
  load_in_time: string | null;
  set_time: string | null;
  address: string | null;
  rider_notes: string | null;
  contract_media_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingInquiry = {
  id: string;
  artist_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_name: string | null;
  event_date_requested: string | null;
  event_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  budget_range: string | null;
  message: string | null;
  source: string;
  status: string;
  booking_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingPayment = {
  id: string;
  booking_id: string;
  amount_cents: number;
  type: string;
  method: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
};

export type CrmContact = {
  id: string;
  name: string;
  contact_type: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  stage: string;
  role_title: string | null;
  rate_notes: string | null;
  value_estimate_cents: number | null;
  tags: string[];
  owner: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmActivity = {
  id: string;
  crm_contact_id: string;
  related_booking_id: string | null;
  type: string;
  content: string;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type PlatformProvider = {
  key: string;
  display_name: string;
  auth_type: string;
  docs_url: string | null;
};

export type PlatformConnection = {
  id: string;
  artist_id: string;
  provider: string;
  auth_type: string;
  credential_ref: string | null;
  status: string;
  scopes: string[] | null;
  last_synced_at: string | null;
  last_error: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
};

export type McpToken = {
  id: string;
  label: string;
  token_hash: string;
  scopes: string[];
  require_confirmation_over_cents: number | null;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type McpActionLog = {
  id: string;
  mcp_token_id: string | null;
  tool_name: string;
  params_redacted: Record<string, unknown>;
  result_status: string;
  result_summary: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  created_at: string;
};

export type EmailCampaign = {
  id: string;
  subject: string;
  body: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number | null;
  open_count: number | null;
  created_at: string;
};

export type WebhookEvent = {
  id: string;
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
};

// CMS types

export type CmsGallery = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  kind: string;
  cover_image_url: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CmsImage = {
  id: string;
  gallery_id: string;
  title: string | null;
  caption: string | null;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type CmsVideo = {
  id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
};

export type CmsBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  linked_event_id: string | null;
  position: string;
  published: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

// Ticketing types

export type TicketEvent = {
  id: string;
  artist_id: string | null;
  booking_id: string | null;
  title: string;
  description: string | null;
  venue_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  event_date: string;
  door_time: string | null;
  show_time: string | null;
  age_restriction: string | null;
  cover_image_url: string | null;
  published: boolean;
  capacity: number | null;
  created_at: string;
  updated_at: string;
};

export type TicketTier = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity: number;
  sold_count: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  sort_order: number;
  created_at: string;
};

export type TicketOrder = {
  id: string;
  event_id: string;
  user_id: string | null;
  fan_email: string;
  fan_name: string | null;
  tier_id: string;
  quantity: number;
  total_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  order_id: string;
  event_id: string;
  tier_id: string;
  user_id: string | null;
  ticket_code: string;
  holder_name: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
};

// Fan management types

export type FanProfile = {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  marketing_opt_in: boolean;
  sms_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export type FanFavorite = {
  id: string;
  user_id: string;
  event_id: string | null;
  created_at: string;
};
