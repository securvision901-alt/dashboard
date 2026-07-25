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

// B2B Portal types

export type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  branding_config: Record<string, unknown>;
  plan: string;
  status: string;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PortalUser = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string | null;
  role: 'admin' | 'label' | 'booking' | 'writer';
  secondary_roles: string[];
  org_name: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  verified_at: string | null;
  last_login_at: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  social_links: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CatalogSong = {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  alternate_titles: string[];
  description: string | null;
  lyrics: string | null;
  explicit: boolean;
  language: string | null;
  genre: string;
  mood_tags: string[];
  energy: number | null;
  valence: number | null;
  bpm: number | null;
  key: string | null;
  time_signature: string | null;
  duration_seconds: number;
  composer: string[];
  producer: string[];
  mix_engineer: string | null;
  master_owner: string | null;
  publishing_owner: string | null;
  recording_year: number | null;
  release_year: number | null;
  album: string | null;
  version_label: string | null;
  isrc: string | null;
  iswc: string | null;
  upc: string | null;
  pro: string | null;
  splits: unknown[];
  stems_available: boolean;
  master_url: string | null;
  preview_url: string | null;
  watermarked_url: string | null;
  cover_art_url: string | null;
  distribution_flag: 'public_streaming' | 'catalog_only' | 'private';
  distribution_status: 'not_submitted' | 'validation_failed' | 'submitted' | 'published' | 'error';
  sync_status: 'available' | 'on_hold' | 'licensed' | 'sold' | 'not_for_sync';
  for_sale: boolean;
  asking_price: number | null;
  asking_price_negotiable: boolean;
  visible_to_roles: string[];
  is_active: boolean;
  published_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PortalRequest = {
  id: string;
  tenant_id: string;
  user_id: string;
  song_id: string | null;
  type: 'booking' | 'sync' | 'collab' | 'purchase' | 'custom_write';
  status: string;
  assigned_to: string | null;
  payload: Record<string, unknown>;
  blocked_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RequestStatusHistory = {
  id: string;
  tenant_id: string;
  request_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
  created_at: string;
};

export type CollabCall = {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  what_needed: string;
  deadline: string | null;
  status: 'open' | 'closed' | 'filled';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MessageThread = {
  id: string;
  tenant_id: string;
  request_id: string | null;
  subject: string | null;
  user_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Message = {
  id: string;
  tenant_id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_internal_note: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type PortalNotification = {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type SpendEntry = {
  id: string;
  tenant_id: string;
  category: string;
  direction: string;
  amount: number;
  currency: string;
  related_request_id: string | null;
  related_song_id: string | null;
  notes: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PortalDocument = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  request_id: string | null;
  song_id: string | null;
  file_url: string;
  file_name: string;
  type: string;
  esign_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AvailabilityHold = {
  id: string;
  tenant_id: string;
  date: string;
  status: 'open' | 'hold' | 'booked' | 'blocked';
  label: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
};

// User Portal Enhancement types

export type ShopProduct = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  inventory_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ShopOrder = {
  id: string;
  user_id: string | null;
  fan_email: string;
  fan_name: string | null;
  product_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: string;
  shipping_address: string | null;
  tracking_number: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TourDate = {
  id: string;
  title: string;
  venue: string;
  city: string | null;
  state: string | null;
  country: string | null;
  date: string;
  door_time: string | null;
  show_time: string | null;
  ticket_url: string | null;
  ticket_event_id: string | null;
  is_sold_out: boolean;
  is_public: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type UserLoyalty = {
  id: string;
  user_id: string | null;
  fan_email: string;
  total_points: number;
  tier: 'fan' | 'silver' | 'gold' | 'platinum';
  lifetime_spend: number;
  currency: string;
  joined_at: string;
  updated_at: string;
};

export type LoyaltyTransaction = {
  id: string;
  user_id: string | null;
  fan_email: string;
  points: number;
  direction: 'earned' | 'spent';
  reason: string;
  related_order_id: string | null;
  created_at: string;
};
