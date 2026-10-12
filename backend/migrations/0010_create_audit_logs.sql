-- Migration: audit logs for admin actions and system tracking.

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'USER_LOGIN',
    'USER_LOGOUT',
    'REGISTRATION_CREATED',
    'REGISTRATION_CONFIRMED',
    'REGISTRATION_CANCELLED',
    'PAYMENT_PROCESSED',
    'CERTIFICATE_ISSUED',
    'CERTIFICATE_REVOKED',
    'SESSION_CREATED',
    'SESSION_UPDATED',
    'SESSION_DELETED',
    'TRAINING_CREATED',
    'TRAINING_UPDATED',
    'TRAINING_DELETED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'ADMIN_ACTION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_entity AS ENUM (
    'USER',
    'REGISTRATION',
    'PAYMENT',
    'CERTIFICATE',
    'SESSION',
    'TRAINING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM (
    'SUCCESS',
    'WARNING',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "action" audit_action NOT NULL,
  "entity" audit_entity NOT NULL,
  "entity_id" uuid NULL,
  "details" varchar(500) NULL,
  "status" audit_status NOT NULL DEFAULT 'SUCCESS',
  "ipAddress" varchar(100) NULL,
  "userAgent" varchar(500) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON "audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON "audit_logs" ("entity");
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx ON "audit_logs" ("entity_id");
CREATE INDEX IF NOT EXISTS audit_logs_status_idx ON "audit_logs" ("status");
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON "audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx ON "audit_logs" ("actor_id", "created_at" DESC);
