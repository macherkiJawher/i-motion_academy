ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "meeting_url" varchar(1000),
  ADD COLUMN IF NOT EXISTS "schedule_details" text;
