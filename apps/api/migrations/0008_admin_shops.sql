-- 0 hides the Shops area (everything under /admin/) from that staff account.
ALTER TABLE admins ADD COLUMN shops INTEGER NOT NULL DEFAULT 1;
