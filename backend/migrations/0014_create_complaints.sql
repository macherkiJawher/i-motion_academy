-- Complaint management: participant cases, public/internal messages and immutable business events.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COMPLAINT_UPDATED';
ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'COMPLAINT';

CREATE TABLE IF NOT EXISTS "complaints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" varchar(32) NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "category" varchar(32) NOT NULL,
  "subject" varchar(150) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'NEW',
  "priority" varchar(16) NOT NULL DEFAULT 'NORMAL',
  "assigned_to_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "registration_id" uuid NULL REFERENCES "registrations"("id") ON DELETE SET NULL,
  "payment_id" uuid NULL REFERENCES "payments"("id") ON DELETE SET NULL,
  "session_id" uuid NULL REFERENCES "sessions"("id") ON DELETE SET NULL,
  "certificate_id" uuid NULL REFERENCES "certificates"("id") ON DELETE SET NULL,
  "resolution" text NULL,
  "resolved_at" timestamptz NULL,
  "closed_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "complaint_category_valid" CHECK ("category" IN ('REGISTRATION','PAYMENT','SESSION','TRAINING','CERTIFICATE','OTHER')),
  CONSTRAINT "complaint_status_valid" CHECK ("status" IN ('NEW','IN_PROGRESS','WAITING_FOR_PARTICIPANT','RESOLVED','CLOSED','REJECTED')),
  CONSTRAINT "complaint_priority_valid" CHECK ("priority" IN ('LOW','NORMAL','HIGH','CRITICAL'))
);

CREATE TABLE IF NOT EXISTS "complaint_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "complaint_id" uuid NOT NULL REFERENCES "complaints"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "content" text NOT NULL,
  "visibility" varchar(16) NOT NULL DEFAULT 'PARTICIPANT',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "complaint_message_visibility_valid" CHECK ("visibility" IN ('PARTICIPANT','INTERNAL'))
);

CREATE TABLE IF NOT EXISTS "complaint_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "complaint_id" uuid NOT NULL REFERENCES "complaints"("id") ON DELETE CASCADE,
  "actor_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "type" varchar(48) NOT NULL,
  "details" varchar(500) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "complaints_user_updated_idx" ON "complaints" ("user_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "complaints_queue_idx" ON "complaints" ("status", "priority", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "complaints_assignee_idx" ON "complaints" ("assigned_to_user_id", "status");
CREATE INDEX IF NOT EXISTS "complaint_messages_complaint_idx" ON "complaint_messages" ("complaint_id", "created_at");
CREATE INDEX IF NOT EXISTS "complaint_events_complaint_idx" ON "complaint_events" ("complaint_id", "created_at");

CREATE OR REPLACE FUNCTION update_complaint_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "trigger_complaint_updated_at" ON "complaints";
CREATE TRIGGER "trigger_complaint_updated_at" BEFORE UPDATE ON "complaints" FOR EACH ROW EXECUTE FUNCTION update_complaint_timestamp();
