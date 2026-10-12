-- Migration: in-app notifications for participants and admins.
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('REGISTRATION_RECEIVED', 'REGISTRATION_CONFIRMED', 'PAYMENT', 'SESSION_REMINDER', 'CERTIFICATE_AVAILABLE', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" notification_type NOT NULL,
  "title" varchar(180) NOT NULL,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "link" varchar(1024) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON "notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON "notifications" ("user_id", "read") WHERE "read" = false;
