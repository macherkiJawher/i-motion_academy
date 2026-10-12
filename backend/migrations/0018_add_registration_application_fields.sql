ALTER TABLE "registrations"
  ADD COLUMN IF NOT EXISTS "birth_date" date,
  ADD COLUMN IF NOT EXISTS "address" varchar(300),
  ADD COLUMN IF NOT EXISTS "city" varchar(120),
  ADD COLUMN IF NOT EXISTS "country" varchar(120),
  ADD COLUMN IF NOT EXISTS "education_level" varchar(160),
  ADD COLUMN IF NOT EXISTS "work_experience" text,
  ADD COLUMN IF NOT EXISTS "employment_status" varchar(160),
  ADD COLUMN IF NOT EXISTS "identity_document" varchar(1024),
  ADD COLUMN IF NOT EXISTS "qualification_document" varchar(1024),
  ADD COLUMN IF NOT EXISTS "motivation" text,
  ADD COLUMN IF NOT EXISTS "referral_source" varchar(80);