-- Migration: payments linked to participant registrations.
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" varchar(32) NOT NULL UNIQUE,
  "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE RESTRICT,
  "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "amount" double precision NOT NULL CHECK (amount > 0),
  "currency" varchar(3) NOT NULL DEFAULT 'TND',
  "method" varchar(20) NOT NULL CHECK (method IN ('CARD', 'TRANSFER', 'CASH', 'CHEQUE')),
  "status" payment_status NOT NULL DEFAULT 'PAID',
  "paid_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_registration_id_idx ON "payments" ("registration_id");
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON "payments" ("user_id");
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON "payments" ("created_at");
