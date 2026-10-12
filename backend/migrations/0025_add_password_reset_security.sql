ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_reset_token_hash" varchar(64),
  ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "IDX_users_password_reset_token_hash"
  ON "users" ("password_reset_token_hash")
  WHERE "password_reset_token_hash" IS NOT NULL;
