ALTER TABLE registrations ADD COLUMN status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'contacted', 'confirmed', 'cancelled'));
ALTER TABLE registrations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid'));
ALTER TABLE registrations ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN updated_at TEXT;
