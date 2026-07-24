/*
# CMS, Ticketing & Fan Management Schema

This migration adds three new clusters to the admin portal:

## 1. CMS (Content Management System)
- `cms_galleries` — named galleries for images or videos
- `cms_images` — images published to a gallery, with title/caption/url
- `cms_videos` — videos published to a gallery, with title/description/url
- `cms_banners` — promotional banners shown on the user portal, linkable to events or external URLs

## 2. Ticketing
- `ticket_events` — ticketed events (can link to a booking), with venue, date, description, cover image, published status
- `ticket_tiers` — ticket tiers per event (e.g. General Admission, VIP), with price in cents, quantity, and sold count
- `ticket_orders` — fan ticket purchases, linked to a Stripe payment intent
- `tickets` — individual tickets issued from an order (one per quantity unit)

## 3. Fan Management
- `fan_profiles` — extended fan data beyond the basic `fans` table: display name, avatar, bio, location, opt-in preferences
- `fan_favorites` — tracks which events a fan has favorited

All money fields are in integer cents. The portal is single-tenant (no public sign-in on admin side), so new admin-managed tables use open anon+authenticated CRUD. The user portal will use Supabase auth for fan accounts — fan-scoped tables use `user_id` + `auth.uid()` ownership policies.

Important notes:
- `ticket_events` can optionally link to `bookings` (admin-managed booking → public ticket event).
- `ticket_tiers.sold_count` is maintained via trigger when tickets are inserted/deleted.
- `fan_profiles` extends (not replaces) the `fans` table.
- Ordering: ticket_events created before cms_banners (FK dependency).
*/

-- ============================================================
-- 1. CMS — GALLERIES (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS cms_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'image' CHECK (kind IN ('image','video')),
  cover_image_url text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. CMS — IMAGES (deps: cms_galleries)
-- ============================================================

CREATE TABLE IF NOT EXISTS cms_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES cms_galleries(id) ON DELETE CASCADE,
  title text,
  caption text,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. CMS — VIDEOS (deps: cms_galleries)
-- ============================================================

CREATE TABLE IF NOT EXISTS cms_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES cms_galleries(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. TICKETING — EVENTS (deps: artists, bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  venue_name text NOT NULL,
  address text,
  city text,
  state text,
  country text,
  event_date timestamptz NOT NULL,
  door_time time,
  show_time time,
  age_restriction text,
  cover_image_url text,
  published boolean NOT NULL DEFAULT false,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. CMS — BANNERS (deps: ticket_events)
-- ============================================================

CREATE TABLE IF NOT EXISTS cms_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  cta_text text,
  cta_link text,
  linked_event_id uuid REFERENCES ticket_events(id) ON DELETE SET NULL,
  position text NOT NULL DEFAULT 'hero' CHECK (position IN ('hero','promo','sidebar','footer')),
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. TICKETING — TIERS (deps: ticket_events)
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES ticket_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  sold_count integer NOT NULL DEFAULT 0,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. TICKETING — ORDERS (deps: ticket_events, ticket_tiers)
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES ticket_events(id) ON DELETE CASCADE,
  user_id uuid,
  fan_email text NOT NULL,
  fan_name text,
  tier_id uuid NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','cancelled')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. TICKETING — INDIVIDUAL TICKETS (deps: ticket_orders, ticket_events, ticket_tiers)
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES ticket_events(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  user_id uuid,
  ticket_code text UNIQUE NOT NULL,
  holder_name text,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. FAN PROFILES (no deps)
-- ============================================================

CREATE TABLE IF NOT EXISTS fan_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  city text,
  state text,
  country text,
  marketing_opt_in boolean NOT NULL DEFAULT true,
  sms_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. FAN FAVORITES (deps: ticket_events)
-- ============================================================

CREATE TABLE IF NOT EXISTS fan_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES ticket_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cms_images_gallery ON cms_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_cms_videos_gallery ON cms_videos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_cms_banners_published ON cms_banners(published);
CREATE INDEX IF NOT EXISTS idx_ticket_events_date ON ticket_events(event_date);
CREATE INDEX IF NOT EXISTS idx_ticket_events_published ON ticket_events(published);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_event ON ticket_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_user ON ticket_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_fan_profiles_user ON fan_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_fan_favorites_user ON fan_favorites(user_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_cms_galleries_updated ON cms_galleries;
CREATE TRIGGER trg_cms_galleries_updated BEFORE UPDATE ON cms_galleries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_cms_banners_updated ON cms_banners;
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON cms_banners
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_ticket_events_updated ON ticket_events;
CREATE TRIGGER trg_ticket_events_updated BEFORE UPDATE ON ticket_events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_fan_profiles_updated ON fan_profiles;
CREATE TRIGGER trg_fan_profiles_updated BEFORE UPDATE ON fan_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- TICKET TIER SOLD COUNT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION increment_tier_sold_count()
RETURNS trigger AS $$
BEGIN
  UPDATE ticket_tiers SET sold_count = sold_count + 1 WHERE id = NEW.tier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_tier_sold_count()
RETURNS trigger AS $$
BEGIN
  UPDATE ticket_tiers SET sold_count = GREATEST(0, sold_count - 1) WHERE id = OLD.tier_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_insert_sold ON tickets;
CREATE TRIGGER trg_tickets_insert_sold
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION increment_tier_sold_count();

DROP TRIGGER IF EXISTS trg_tickets_delete_sold ON tickets;
CREATE TRIGGER trg_tickets_delete_sold
  AFTER DELETE ON tickets
  FOR EACH ROW EXECUTE FUNCTION decrement_tier_sold_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Admin-managed CMS + ticket tables: open CRUD (anon + authenticated)
ALTER TABLE cms_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_favorites ENABLE ROW LEVEL SECURITY;

-- Helper: apply open CRUD policy set to all new tables
DO $$
DECLARE
  t text;
  new_tables text[] := ARRAY[
    'cms_galleries','cms_images','cms_videos','cms_banners',
    'ticket_events','ticket_tiers','ticket_orders','tickets',
    'fan_profiles','fan_favorites'
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
