DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('PHYSICAL', 'ONLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(180) NOT NULL,
  "type" location_type NOT NULL,
  "city" varchar(120) NOT NULL DEFAULT '',
  "country" varchar(120) NOT NULL DEFAULT '',
  "address" varchar(300) NOT NULL DEFAULT '',
  "latitude" double precision,
  "longitude" double precision,
  "contact_name" varchar(160),
  "contact_phone" varchar(40),
  "contact_email" varchar(200),
  "instructions" text NOT NULL DEFAULT '',
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT locations_coordinates_pair CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR (
      "latitude" IS NOT NULL AND "longitude" IS NOT NULL
      AND "latitude" BETWEEN -90 AND 90
      AND "longitude" BETWEEN -180 AND 180
    )
  ),
  CONSTRAINT physical_locations_have_address CHECK (
    "type" <> 'PHYSICAL'
    OR (length(trim("city")) > 0 AND length(trim("country")) > 0 AND length(trim("address")) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_locations_active_city ON "locations" ("active", "city");

CREATE TABLE IF NOT EXISTS "trainers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid UNIQUE REFERENCES "users"("id") ON DELETE SET NULL,
  "slug" varchar(180) NOT NULL UNIQUE,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "email" varchar(200) NOT NULL,
  "phone" varchar(40),
  "speciality" varchar(160) NOT NULL,
  "expertise" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "biography" text NOT NULL DEFAULT '',
  "photo_url" varchar(1024) NOT NULL DEFAULT '',
  "years_experience" integer NOT NULL DEFAULT 0 CHECK ("years_experience" >= 0),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS trainers_email_lower_unique ON "trainers" (lower("email"));
CREATE INDEX IF NOT EXISTS idx_trainers_active_name ON "trainers" ("active", "last_name", "first_name");

CREATE TABLE IF NOT EXISTS "trainer_trainings" (
  "trainer_id" uuid NOT NULL REFERENCES "trainers"("id") ON DELETE CASCADE,
  "training_id" uuid NOT NULL REFERENCES "trainings"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("trainer_id", "training_id")
);

CREATE TABLE IF NOT EXISTS "session_trainers" (
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "trainer_id" uuid NOT NULL REFERENCES "trainers"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("session_id", "trainer_id")
);

CREATE TABLE IF NOT EXISTS "session_locations" (
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("session_id", "location_id")
);

CREATE INDEX IF NOT EXISTS idx_session_trainers_trainer ON "session_trainers" ("trainer_id");
CREATE INDEX IF NOT EXISTS idx_session_locations_location ON "session_locations" ("location_id");
