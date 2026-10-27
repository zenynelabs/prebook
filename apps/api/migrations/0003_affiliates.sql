CREATE TABLE affiliates (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
ALTER TABLE registrations ADD COLUMN ref TEXT REFERENCES affiliates(code);
