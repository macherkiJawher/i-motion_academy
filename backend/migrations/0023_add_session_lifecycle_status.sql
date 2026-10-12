DO $$
BEGIN
  CREATE TYPE session_lifecycle_status AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'CANCELLED',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "lifecycle_status" session_lifecycle_status NOT NULL DEFAULT 'SCHEDULED';
