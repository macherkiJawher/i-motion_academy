-- Adds the catalogue taxonomy and the regulatory information required for BTP/BTS paths.
ALTER TYPE training_axis_code ADD VALUE IF NOT EXISTS 'SPORT_COACHING';
ALTER TYPE training_axis_code ADD VALUE IF NOT EXISTS 'WELLNESS';
ALTER TYPE training_axis_code ADD VALUE IF NOT EXISTS 'BTP';
ALTER TYPE training_axis_code ADD VALUE IF NOT EXISTS 'BTS';

DO $$ BEGIN
  CREATE TYPE training_recognition_type AS ENUM ('NONE', 'I_MOTION_CERTIFICATE', 'BTP_DIPLOMA', 'BTS_DIPLOMA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE training_approval_status AS ENUM ('NOT_APPLICABLE', 'PENDING', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS subcategory varchar(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recognition_type training_recognition_type NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS approval_status training_approval_status NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN IF NOT EXISTS approval_reference varchar(200),
  ADD COLUMN IF NOT EXISTS approval_authority varchar(200),
  ADD COLUMN IF NOT EXISTS approval_valid_until date;

UPDATE trainings
SET recognition_type = 'I_MOTION_CERTIFICATE'
WHERE certification IS NOT NULL AND certification <> '' AND recognition_type = 'NONE';

CREATE INDEX IF NOT EXISTS idx_trainings_recognition ON trainings (recognition_type, approval_status);
