-- Migration: certificate PDFs, revocation metadata, completion date and audit log.
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "completed_at" timestamptz NULL;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "completed_at" timestamptz NULL;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz NULL;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revocation_reason" text NULL;

DO $$ BEGIN
  ALTER TYPE certificate_status ADD VALUE IF NOT EXISTS 'REVOKED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE certificate_audit_action AS ENUM ('ISSUED', 'ARCHIVED', 'REVOKED', 'DOWNLOADED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "certificate_audits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "certificate_id" uuid NOT NULL REFERENCES "certificates"("id") ON DELETE CASCADE,
  "actor_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "action" certificate_audit_action NOT NULL,
  "details" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificate_audits_certificate_id_idx ON "certificate_audits" ("certificate_id");
CREATE INDEX IF NOT EXISTS certificate_audits_created_at_idx ON "certificate_audits" ("created_at");
