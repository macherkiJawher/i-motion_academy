ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_flagged" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "flag_reason" varchar(500),
  ADD COLUMN IF NOT EXISTS "flagged_by" uuid,
  ADD COLUMN IF NOT EXISTS "flagged_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_users_is_flagged"
  ON "users" ("is_flagged");

CREATE INDEX IF NOT EXISTS "idx_users_flagged_at"
  ON "users" ("flagged_at");
