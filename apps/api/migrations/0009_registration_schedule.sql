ALTER TABLE registrations ADD COLUMN ride_date TEXT
  CHECK (ride_date IS NULL OR ride_date = '2026-11-06');
ALTER TABLE registrations ADD COLUMN ride_time TEXT
  CHECK (
    (ride_date IS NULL AND ride_time IS NULL) OR
    (ride_date IS NOT NULL AND ride_time IS NOT NULL AND
     ride_time GLOB '[0-2][0-9]:[0-5][0-9]' AND ride_time <= '23:59')
  );
