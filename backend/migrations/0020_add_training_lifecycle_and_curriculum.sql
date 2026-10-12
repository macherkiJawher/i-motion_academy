DO $$ BEGIN
  CREATE TYPE training_lifecycle_status AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE training_duration_unit AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS lifecycle_status training_lifecycle_status,
  ADD COLUMN IF NOT EXISTS duration_value double precision,
  ADD COLUMN IF NOT EXISTS duration_unit training_duration_unit NOT NULL DEFAULT 'HOURS',
  ADD COLUMN IF NOT EXISTS objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credential_title varchar(200),
  ADD COLUMN IF NOT EXISTS credential_issuer varchar(200);

UPDATE trainings
SET lifecycle_status = CASE
  WHEN active = false THEN 'ARCHIVED'::training_lifecycle_status
  WHEN axis_code::text IN ('BTP', 'BTS')
    AND (
      recognition_type::text NOT IN ('BTP_DIPLOMA', 'BTS_DIPLOMA')
      OR approval_status::text <> 'APPROVED'
      OR NULLIF(BTRIM(approval_reference), '') IS NULL
      OR NULLIF(BTRIM(approval_authority), '') IS NULL
      OR approval_valid_until IS NULL
      OR approval_valid_until < CURRENT_DATE
      OR NULLIF(BTRIM(certification), '') IS NULL
    ) THEN 'IN_REVIEW'::training_lifecycle_status
  ELSE 'PUBLISHED'::training_lifecycle_status
END
WHERE lifecycle_status IS NULL;

UPDATE trainings
SET duration_value = duration_hours,
    duration_unit = CASE
      WHEN axis_code::text = 'BTP' AND recognition_type::text = 'BTP_DIPLOMA' THEN 'YEARS'::training_duration_unit
      WHEN axis_code::text = 'BTS' AND recognition_type::text = 'BTS_DIPLOMA' THEN 'YEARS'::training_duration_unit
      ELSE 'HOURS'::training_duration_unit
    END
WHERE duration_value IS NULL;

UPDATE trainings
SET credential_title = NULLIF(BTRIM(certification), '')
WHERE credential_title IS NULL AND NULLIF(BTRIM(certification), '') IS NOT NULL;

ALTER TABLE trainings
  ALTER COLUMN lifecycle_status SET DEFAULT 'DRAFT',
  ALTER COLUMN lifecycle_status SET NOT NULL,
  ALTER COLUMN duration_value SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE trainings
    ADD CONSTRAINT trainings_duration_value_positive CHECK (duration_value > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_trainings_lifecycle_status ON trainings (lifecycle_status);