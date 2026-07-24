/*
# Admin Portal — Core Schema (v1 + v2)

This migration creates the full table cluster for the admin portal described in
ADMIN_PORTAL_SPEC_v2.md. It covers six clusters:

1. Catalog — releases, tracks, media_assets, distribution_submissions
2. Commerce & Fans — orders, order_items, download_grants, fans, fan_events
3. Bookings — booking_inquiries, bookings, booking_payments
4. CRM — crm_contacts, crm_activities
5. Integrations — artists, platform_providers, platform_connections
6. Automation — mcp_tokens, mcp_action_log
7. Comms & Ops — email_campaigns, webhook_events

The portal is a single-tenant admin tool for now (no public sign-in screen), so
every table uses open anon+authenticated CRUD policies. When real multi-admin
auth is added later, tighten these policies to ownership checks.

All money fields are stored in integer cents. All enums use TEXT + CHECK
constraints (no native enum types) so adding a new value is a data change, not
a migration. Every table has created_at / updated_at where the spec lists them.

Important notes:
- `artists` is a real roster table; `releases.artist_id` FK points to it.
- `booking_payments` has a trigger that recalculates `bookings.status` based on
  the sum of payments vs. fee/deposit thresholds.
- `platform_providers` is seeded with the providers listed in the spec.
- Circular FK between bookings <-> booking_inquiries is resolved by creating
  bookings first without the inquiry_id FK, then adding it via ALTER TABLE.
*/

-- ============================================================
-- 1. ARTISTS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  bio text,
  image_media_id uuid,
  is_own_artist boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. MEDIA ASSETS (deps: artists)
-- ============================================================

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('image','audio','video','document','other')),
  label text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PLATFORM PROVIDERS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_providers (
  key text PRIMARY KEY,
  display_name text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('oauth','api_key','manual')),
  docs_url text
);

-- ============================================================
-- 4. PLATFORM CONNECTIONS (deps: artists, platform_providers)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES platform_providers(key),
  auth_type text NOT NULL CHECK (auth_type IN ('oauth','api_key','manual')),
  credential_ref text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('connected','disconnected','error','pending')),
  scopes text[],
  last_synced_at timestamptz,
  last_error text,
  connected_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, provider)
);

-- ============================================================
-- 5. RELEASES (deps: artists, media_assets)
-- ============================================================

CREATE TABLE IF NOT EXISTS releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'single' CHECK (type IN ('single','ep','album')),
  release_date date,
  cover_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','live','delisted')),
  catalog_number text,
  upc text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. TRACKS (deps: releases, media_assets)
-- ============================================================

CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  duration_seconds integer,
  isrc text,
  isrc_explicit boolean NOT NULL DEFAULT false,
  audio_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','delisted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. DISTRIBUTION SUBMISSIONS (deps: releases, platform_connections)
-- ============================================================

CREATE TABLE IF NOT EXISTS distribution_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  platform_connection_id uuid REFERENCES platform_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','accepted','rejected','live')),
  submitted_at timestamptz,
  response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. FANS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS fans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  subscribed boolean NOT NULL DEFAULT true,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. ORDERS (deps: fans)
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid REFERENCES fans(id) ON DELETE SET NULL,
  amount_total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','cancelled')),
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. ORDER ITEMS (deps: orders, releases, tracks)
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  release_id uuid REFERENCES releases(id) ON DELETE SET NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  product_type text NOT NULL CHECK (product_type IN ('digital','physical','bundle')),
  label text,
  amount_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. DOWNLOAD GRANTS (deps: order_items, fans)
-- ============================================================

CREATE TABLE IF NOT EXISTS download_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  fan_id uuid REFERENCES fans(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. FAN EVENTS (deps: fans)
-- ============================================================

CREATE TABLE IF NOT EXISTS fan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL REFERENCES fans(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. CRM CONTACTS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('venue','bar_club','promoter','stylist','photographer','publicist','agent','vendor','press','team','other')),
  company text,
  email text,
  phone text,
  city text,
  state text,
  country text,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','negotiating','active','inactive','lost')),
  role_title text,
  rate_notes text,
  value_estimate_cents integer,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner text,
  notes text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. BOOKINGS (deps: artists, crm_contacts, media_assets)
-- inquiry_id FK added later (circular with booking_inquiries)
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  inquiry_id uuid,
  event_name text NOT NULL,
  venue_name text NOT NULL,
  crm_contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  event_type text CHECK (event_type IN ('club','private','festival','corporate','wedding','other')),
  status text NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry','hold','confirmed','contract_sent','contract_signed','deposit_paid','paid_in_full','completed','cancelled')),
  fee_cents integer NOT NULL DEFAULT 0,
  deposit_cents integer,
  deposit_due_date date,
  balance_due_date date,
  set_length_minutes integer,
  load_in_time time,
  set_time time,
  address text,
  rider_notes text,
  contract_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. BOOKING INQUIRIES (deps: artists, bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  event_name text,
  event_date_requested date,
  event_type text CHECK (event_type IN ('club','private','festival','corporate','wedding','other')),
  city text,
  state text,
  country text,
  budget_range text,
  message text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('web_form','in_app','manual','email','dm')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','negotiating','won','lost','spam')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Now add the circular FK: bookings.inquiry_id -> booking_inquiries.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_inquiry_id_fkey' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_inquiry_id_fkey
      FOREIGN KEY (inquiry_id) REFERENCES booking_inquiries(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 16. BOOKING PAYMENTS (deps: bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit','balance','other')),
  method text NOT NULL DEFAULT 'other' CHECK (method IN ('stripe','cash','check','wire','venmo','other')),
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. CRM ACTIVITIES (deps: crm_contacts, bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  related_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('call','email','meeting','note','task')),
  content text NOT NULL,
  due_date date,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. MCP TOKENS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  require_confirmation_over_cents integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- ============================================================
-- 19. MCP ACTION LOG (deps: mcp_tokens)
-- ============================================================

CREATE TABLE IF NOT EXISTS mcp_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_token_id uuid REFERENCES mcp_tokens(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  params_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_status text NOT NULL CHECK (result_status IN ('success','error','pending_confirmation','confirmed','rejected')),
  result_summary text,
  related_record_type text,
  related_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 20. EMAIL CAMPAIGNS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer,
  open_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 21. WEBHOOK EVENTS (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO artists (name, slug, is_own_artist) VALUES ('My Artist', 'my-artist', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO platform_providers (key, display_name, auth_type, docs_url) VALUES
  ('toolost', 'TooLost', 'api_key', NULL),
  ('spotify', 'Spotify for Artists', 'oauth', NULL),
  ('apple', 'Apple Music for Artists', 'oauth', NULL),
  ('youtube', 'YouTube Content ID', 'oauth', NULL),
  ('soundcloud', 'SoundCloud', 'oauth', NULL),
  ('bandcamp', 'Bandcamp', 'api_key', NULL),
  ('distrokid', 'DistroKid', 'manual', NULL),
  ('other', 'Other', 'manual', NULL)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_releases_artist ON releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_fans_subscribed ON fans(subscribed);
CREATE INDEX IF NOT EXISTS idx_bookings_artist ON bookings(artist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_booking_inquiries_status ON booking_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_type ON crm_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage ON crm_contacts(stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_artist ON platform_connections(artist_id);
CREATE INDEX IF NOT EXISTS idx_mcp_action_log_token ON mcp_action_log(mcp_token_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_releases_updated ON releases;
CREATE TRIGGER trg_releases_updated BEFORE UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_fans_updated ON fans;
CREATE TRIGGER trg_fans_updated BEFORE UPDATE ON fans
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated ON bookings;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_booking_inquiries_updated ON booking_inquiries;
CREATE TRIGGER trg_booking_inquiries_updated BEFORE UPDATE ON booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_contacts_updated ON crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_platform_connections_updated ON platform_connections;
CREATE TRIGGER trg_platform_connections_updated BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- BOOKING PAYMENT STATUS RECALC
-- ============================================================

CREATE OR REPLACE FUNCTION recalc_booking_payment_status(p_booking_id uuid)
RETURNS void AS $$
DECLARE
  v_fee integer;
  v_deposit integer;
  v_paid integer;
  v_new_status text;
  v_current text;
BEGIN
  SELECT fee_cents, COALESCE(deposit_cents, 0), status
    INTO v_fee, v_deposit, v_current
  FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
  FROM booking_payments WHERE booking_id = p_booking_id AND paid_at IS NOT NULL;

  IF v_fee > 0 AND v_paid >= v_fee THEN
    v_new_status := 'paid_in_full';
  ELSIF v_deposit > 0 AND v_paid >= v_deposit THEN
    v_new_status := 'deposit_paid';
  ELSE
    RETURN; -- don't downgrade a manually-set status
  END IF;

  IF v_new_status IS DISTINCT FROM v_current
     AND v_current NOT IN ('cancelled','completed') THEN
    UPDATE bookings SET status = v_new_status WHERE id = p_booking_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_recalc_booking_payment()
RETURNS trigger AS $$
BEGIN
  PERFORM recalc_booking_payment_status(NEW.booking_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_payments_recalc ON booking_payments;
CREATE TRIGGER trg_booking_payments_recalc
  AFTER INSERT OR UPDATE ON booking_payments
  FOR EACH ROW EXECUTE FUNCTION trigger_recalc_booking_payment();

-- ============================================================
-- ROW LEVEL SECURITY
-- Single-tenant admin portal (no public sign-in screen yet).
-- Open CRUD for anon + authenticated so the portal reads/writes.
-- Tighten to ownership checks when multi-admin auth is added.
-- ============================================================

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Helper: apply open CRUD policy set to a table
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'artists','media_assets','releases','tracks','distribution_submissions',
    'fans','orders','order_items','download_grants','fan_events',
    'booking_inquiries','bookings','booking_payments',
    'crm_contacts','crm_activities','platform_providers','platform_connections',
    'mcp_tokens','mcp_action_log','email_campaigns','webhook_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "open_select_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "open_select_%s" ON %I FOR SELECT TO anon, authenticated USING (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "open_insert_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "open_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "open_update_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "open_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "open_delete_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "open_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;
