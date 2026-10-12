-- Migration: participant registrations for scheduled sessions.
DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" varchar(32) NOT NULL UNIQUE,
  "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "participant_name" varchar(200) NOT NULL,
  "participant_email" varchar(200) NOT NULL,
  "phone" varchar(40) NULL,
  "notes" text NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE RESTRICT,
  "status" registration_status NOT NULL DEFAULT 'PENDING',
  "payment_status" payment_status NOT NULL DEFAULT 'PENDING',
  "amount_due" double precision NOT NULL DEFAULT 0,
  "amount_paid" double precision NOT NULL DEFAULT 0,
  "currency" varchar(3) NOT NULL DEFAULT 'TND',
  "certificate_id" uuid NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registrations_amounts_valid CHECK (amount_due >= 0 AND amount_paid >= 0 AND amount_paid <= amount_due)
);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_email_session_unique
  ON "registrations" (lower("participant_email"), "session_id")
  WHERE "status" <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS registrations_user_id_idx ON "registrations" ("user_id");
CREATE INDEX IF NOT EXISTS registrations_session_id_idx ON "registrations" ("session_id");
