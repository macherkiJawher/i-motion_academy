-- Migration: certificates issued after completed registrations.
CREATE TYPE certificate_type AS ENUM ('CERTIFICATE', 'DIPLOMA');
CREATE TYPE certificate_status AS ENUM ('ISSUED', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS "certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" varchar(32) NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "registration_id" uuid NOT NULL UNIQUE REFERENCES "registrations"("id") ON DELETE RESTRICT,
  "type" certificate_type NOT NULL,
  "issued_at" timestamptz NOT NULL DEFAULT now(),
  "status" certificate_status NOT NULL DEFAULT 'ISSUED',
  "file_url" varchar(1024) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON "certificates" ("user_id");
CREATE INDEX IF NOT EXISTS certificates_issued_at_idx ON "certificates" ("issued_at");

DO $$ BEGIN
  ALTER TABLE "registrations"
    ADD CONSTRAINT registrations_certificate_id_fk
    FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
