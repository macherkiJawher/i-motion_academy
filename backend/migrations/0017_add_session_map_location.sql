ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "address" varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "latitude" double precision,
  ADD COLUMN IF NOT EXISTS "longitude" double precision;

ALTER TABLE "sessions"
  DROP CONSTRAINT IF EXISTS sessions_coordinates_valid;

ALTER TABLE "sessions"
  ADD CONSTRAINT sessions_coordinates_valid CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );