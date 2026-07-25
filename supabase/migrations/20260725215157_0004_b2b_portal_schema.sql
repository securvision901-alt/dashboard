/*
# B2B Portal Schema — Sync/Booking/Writer/Collab

Multi-tenant-ready schema for the artist sync/booking/collab portal.
v1 ships single-tenant but every table carries tenant_id so multi-tenancy
is a config flip, not a rebuild.

## New Tables
- `tenants` — root tenant entity (v1 has one row)
- `portal_users` — B2B users (label, booking, writer, admin) with approval workflow
- `catalog_songs` — sync-licensing catalog with metadata, mood tags, BPM, key, splits, distribution/sync/sale flags
- `portal_requests` — unified request table (booking, sync, collab, purchase, custom_write) with JSON payload + status history
- `request_status_history` — append-only audit trail per request
- `collab_calls` — admin-posted open collaboration opportunities
- `message_threads` — 1:1 conversation threads between user and admin
- `messages` — individual messages in threads
- `notifications` — in-app notification feed
- `spend_entries` — financial tracking (expenses and revenue)
- `portal_documents` — contracts, invoices, EPKs, riders shared with external users
- `availability_holds` — calendar holds/bookings visible to booking agents

## Security
- All tables RLS-enabled with open anon+authenticated CRUD (single-tenant v1)
- portal_users has unique email per tenant
- catalog_songs has visibility controlled by visible_to_roles array
*/

-- ============================================================
-- 1. TENANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  subdomain varchar(63) NOT NULL UNIQUE,
  custom_domain varchar(255) UNIQUE,
  branding_config jsonb NOT NULL DEFAULT '{}',
  plan varchar(20) NOT NULL DEFAULT 'single_artist',
  status varchar(20) NOT NULL DEFAULT 'active',
  storage_quota_bytes bigint NOT NULL DEFAULT 53687091200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Seed default tenant
INSERT INTO tenants (name, subdomain) VALUES ('Default Artist', 'default')
ON CONFLICT (subdomain) DO NOTHING;

-- ============================================================
-- 2. PORTAL USERS (B2B)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text,
  role varchar(20) NOT NULL CHECK (role IN ('admin','label','booking','writer')),
  secondary_roles text[] NOT NULL DEFAULT '{}',
  org_name varchar(255),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended','rejected')),
  verified_at timestamptz,
  last_login_at timestamptz,
  display_name varchar(255),
  phone varchar(50),
  avatar_url text,
  bio text,
  website text,
  social_links jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, email)
);

-- ============================================================
-- 3. CATALOG SONGS (sync licensing catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  alternate_titles text[] NOT NULL DEFAULT '{}',
  description text,
  lyrics text,
  explicit boolean NOT NULL DEFAULT false,
  language varchar(10),
  genre varchar(100) NOT NULL,
  mood_tags text[] NOT NULL DEFAULT '{}',
  energy smallint CHECK (energy IS NULL OR energy BETWEEN 1 AND 100),
  valence smallint CHECK (valence IS NULL OR valence BETWEEN 1 AND 100),
  bpm integer,
  key varchar(8),
  time_signature varchar(8),
  duration_seconds integer NOT NULL DEFAULT 0,
  composer text[] NOT NULL DEFAULT '{}',
  producer text[] NOT NULL DEFAULT '{}',
  mix_engineer varchar(255),
  master_owner varchar(255),
  publishing_owner varchar(255),
  recording_year smallint,
  release_year smallint,
  album varchar(255),
  version_label varchar(100),
  isrc varchar(15) UNIQUE,
  iswc varchar(15),
  upc varchar(15),
  pro varchar(50),
  splits jsonb NOT NULL DEFAULT '[]',
  stems_available boolean NOT NULL DEFAULT false,
  master_url text,
  preview_url text,
  watermarked_url text,
  cover_art_url text,
  distribution_flag varchar(20) NOT NULL DEFAULT 'private' CHECK (distribution_flag IN ('public_streaming','catalog_only','private')),
  distribution_status varchar(20) NOT NULL DEFAULT 'not_submitted' CHECK (distribution_status IN ('not_submitted','validation_failed','submitted','published','error')),
  sync_status varchar(20) NOT NULL DEFAULT 'not_for_sync' CHECK (sync_status IN ('available','on_hold','licensed','sold','not_for_sync')),
  for_sale boolean NOT NULL DEFAULT false,
  asking_price numeric(10,2),
  asking_price_negotiable boolean NOT NULL DEFAULT true,
  visible_to_roles text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, slug)
);

-- ============================================================
-- 4. PORTAL REQUESTS (unified: booking, sync, collab, purchase, custom_write)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  song_id uuid REFERENCES catalog_songs(id) ON DELETE SET NULL,
  type varchar(20) NOT NULL CHECK (type IN ('booking','sync','collab','purchase','custom_write')),
  status varchar(50) NOT NULL DEFAULT 'draft',
  assigned_to uuid REFERENCES portal_users(id),
  payload jsonb NOT NULL DEFAULT '{}',
  blocked_reason varchar(255),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 5. REQUEST STATUS HISTORY (append-only audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES portal_requests(id) ON DELETE CASCADE,
  from_status varchar(50),
  to_status varchar(50) NOT NULL,
  changed_by uuid NOT NULL REFERENCES portal_users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. COLLAB CALLS (admin-posted opportunities)
-- ============================================================

CREATE TABLE IF NOT EXISTS collab_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  what_needed varchar(255) NOT NULL,
  deadline date,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','filled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 7. MESSAGE THREADS
-- ============================================================

CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  subject varchar(255),
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 8. MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  type varchar(100) NOT NULL,
  related_entity_type varchar(50),
  related_entity_id uuid,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. SPEND ENTRIES (financial tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS spend_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category varchar(20) NOT NULL CHECK (category IN ('marketing','production','commission','legal','other')),
  direction varchar(10) NOT NULL CHECK (direction IN ('expense','revenue')),
  amount numeric(12,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  related_request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  related_song_id uuid REFERENCES catalog_songs(id) ON DELETE SET NULL,
  notes text,
  occurred_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 11. PORTAL DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  song_id uuid REFERENCES catalog_songs(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name varchar(255) NOT NULL,
  type varchar(20) NOT NULL CHECK (type IN ('contract','invoice','epk','rider','other')),
  esign_status varchar(20) NOT NULL DEFAULT 'not_applicable' CHECK (esign_status IN ('not_applicable','sent','partially_signed','signed','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- 12. AVAILABILITY HOLDS (booking calendar)
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','hold','booked','blocked')),
  label varchar(255),
  request_id uuid REFERENCES portal_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_portal_users_tenant_role ON portal_users(tenant_id, role, status);
CREATE INDEX IF NOT EXISTS idx_catalog_songs_tenant_dist ON catalog_songs(tenant_id, distribution_flag);
CREATE INDEX IF NOT EXISTS idx_catalog_songs_tenant_sync ON catalog_songs(tenant_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_catalog_songs_tenant_forsale ON catalog_songs(tenant_id, for_sale);
CREATE INDEX IF NOT EXISTS idx_catalog_songs_mood_tags ON catalog_songs USING GIN (mood_tags);
CREATE INDEX IF NOT EXISTS idx_catalog_songs_visible_roles ON catalog_songs USING GIN (visible_to_roles);
CREATE INDEX IF NOT EXISTS idx_portal_requests_tenant_type_status ON portal_requests(tenant_id, type, status);
CREATE INDEX IF NOT EXISTS idx_portal_requests_user ON portal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rsh_request ON request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_user ON message_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_holds_date ON availability_holds(date);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Reuse touch_updated_at if it exists, otherwise create
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portal_users_updated BEFORE UPDATE ON portal_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_catalog_songs_updated BEFORE UPDATE ON catalog_songs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_portal_requests_updated BEFORE UPDATE ON portal_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_collab_calls_updated BEFORE UPDATE ON collab_calls
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_message_threads_updated BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_spend_entries_updated BEFORE UPDATE ON spend_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_portal_documents_updated BEFORE UPDATE ON portal_documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_availability_holds_updated BEFORE UPDATE ON availability_holds
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_holds ENABLE ROW LEVEL SECURITY;

-- Open CRUD for all tables (single-tenant v1, anon-key client)
DO $$
DECLARE
  t text;
  new_tables text[] := ARRAY[
    'tenants','portal_users','catalog_songs','portal_requests','request_status_history',
    'collab_calls','message_threads','messages','notifications','spend_entries',
    'portal_documents','availability_holds'
  ];
BEGIN
  FOREACH t IN ARRAY new_tables LOOP
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
