/*
# User Portal Enhancement — Shop, Tours, Loyalty

Adds commerce and engagement tables to the existing user portal (fan-facing).

## New Tables
- `shop_products` — merch/physical products for sale in the fan shop
- `shop_orders` — fan purchases of shop products
- `tour_dates` — public tour schedule entries (separate from admin bookings)
- `user_loyalty` — fan loyalty points and tier tracking
- `loyalty_transactions` — ledger of points earned/spent

All money stored as numeric(12,2) with currency column.
RLS: open anon+authenticated (single-tenant v1).
*/

-- ============================================================
-- 1. SHOP PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  description text,
  category varchar(100),
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  image_url text,
  inventory_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. SHOP ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  fan_email text NOT NULL,
  fan_name text,
  product_id uuid NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled','refunded')),
  shipping_address text,
  tracking_number varchar(255),
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TOUR DATES (public schedule)
-- ============================================================

CREATE TABLE IF NOT EXISTS tour_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  venue varchar(255) NOT NULL,
  city varchar(255),
  state varchar(100),
  country varchar(100),
  date date NOT NULL,
  door_time time,
  show_time time,
  ticket_url text,
  ticket_event_id uuid REFERENCES ticket_events(id) ON DELETE SET NULL,
  is_sold_out boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. USER LOYALTY
-- ============================================================

CREATE TABLE IF NOT EXISTS user_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  fan_email text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  tier varchar(20) NOT NULL DEFAULT 'fan' CHECK (tier IN ('fan','silver','gold','platinum')),
  lifetime_spend numeric(12,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. LOYALTY TRANSACTIONS (points ledger)
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  fan_email text NOT NULL,
  points integer NOT NULL,
  direction varchar(10) NOT NULL CHECK (direction IN ('earned','spent')),
  reason varchar(255) NOT NULL,
  related_order_id uuid REFERENCES shop_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_product ON shop_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_tour_dates_date ON tour_dates(date);
CREATE INDEX IF NOT EXISTS idx_tour_dates_public ON tour_dates(is_public);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_user ON user_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_user ON loyalty_transactions(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_shop_products_updated BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_shop_orders_updated BEFORE UPDATE ON shop_orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_tour_dates_updated BEFORE UPDATE ON tour_dates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_user_loyalty_updated BEFORE UPDATE ON user_loyalty
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  new_tables text[] := ARRAY['shop_products','shop_orders','tour_dates','user_loyalty','loyalty_transactions'];
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
