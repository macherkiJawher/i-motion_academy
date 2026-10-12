-- Migration: create the public training catalogue.
CREATE TYPE training_axis_code AS ENUM ('EMS', 'LANGUAGES', 'MANAGEMENT', 'AI');
CREATE TYPE training_level AS ENUM ('Foundation', 'Advanced', 'Master');

CREATE TABLE IF NOT EXISTS "trainings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(180) NOT NULL UNIQUE,
  "title" varchar(200) NOT NULL,
  "axis_code" training_axis_code NOT NULL,
  "tagline" varchar(300) NOT NULL DEFAULT '',
  "description" text NOT NULL DEFAULT '',
  "level" training_level NOT NULL DEFAULT 'Foundation',
  "duration_hours" integer NOT NULL CHECK (duration_hours > 0),
  "price" double precision NOT NULL CHECK (price >= 0),
  "currency" varchar(3) NOT NULL DEFAULT 'TND',
  "certification" varchar(200),
  "target_audience" text NOT NULL DEFAULT '',
  "prerequisites" text NOT NULL DEFAULT '',
  "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "program" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cover_url" varchar(1024) NOT NULL DEFAULT '',
  "rating" double precision NOT NULL DEFAULT 0,
  "learners" integer NOT NULL DEFAULT 0 CHECK (learners >= 0),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainings_active ON "trainings" (active);
CREATE INDEX IF NOT EXISTS idx_trainings_axis_code ON "trainings" (axis_code);
