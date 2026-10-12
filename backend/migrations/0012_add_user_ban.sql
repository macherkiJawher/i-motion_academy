ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_banned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "banned_by" uuid,
  ADD COLUMN IF NOT EXISTS "banned_at" timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_is_banned ON "users" ("is_banned");
