-- Migration: scheduled sessions for trainings.
CREATE TYPE session_mode AS ENUM ('On-site', 'Hybrid', 'Live online');
CREATE TYPE session_status AS ENUM ('OPEN', 'ALMOST_FULL', 'FULL', 'CLOSED');

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "training_id" uuid NOT NULL REFERENCES "trainings" ("id") ON DELETE RESTRICT,
  "trainer_id" uuid,
  "trainer_name" varchar(200) NOT NULL DEFAULT '',
  "location_id" uuid,
  "location_name" varchar(200) NOT NULL DEFAULT '',
  "city" varchar(120) NOT NULL DEFAULT '',
  "mode" session_mode NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "start_time" time NOT NULL DEFAULT '09:00',
  "end_time" time NOT NULL DEFAULT '17:00',
  "capacity" integer NOT NULL CHECK (capacity > 0),
  "seats_taken" integer NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  "status" session_status NOT NULL DEFAULT 'OPEN',
  "price" double precision NOT NULL CHECK (price >= 0),
  "currency" varchar(3) NOT NULL DEFAULT 'TND',
  "certification" varchar(200),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_seats_valid CHECK (seats_taken <= capacity),
  CONSTRAINT sessions_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_training_id ON "sessions" (training_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_date ON "sessions" (start_date);
