-- Shop affiliates. Called partners here so they don't clash with the event's `affiliates` table.
ALTER TABLE shops ADD COLUMN commission_percent INTEGER NOT NULL DEFAULT 0 CHECK (commission_percent BETWEEN 0 AND 50);
CREATE TABLE partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE TABLE partner_sessions (
  token_hash TEXT PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE partner_shops (
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT,
  PRIMARY KEY (partner_id, shop_id)
);
CREATE INDEX partner_shops_by_shop ON partner_shops (shop_id);
-- Commission is fixed when the order is placed, so a later rate change never rewrites it.
ALTER TABLE orders ADD COLUMN partner_id INTEGER REFERENCES partners(id);
ALTER TABLE orders ADD COLUMN commission_paise INTEGER NOT NULL DEFAULT 0 CHECK (commission_paise >= 0);
CREATE INDEX orders_by_partner ON orders (partner_id, id DESC);
