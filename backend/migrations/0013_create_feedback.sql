-- Create feedback table
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "registration_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "session_id" uuid NOT NULL,
  "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "comment" text,
  "feedback_type" varchar(32) NOT NULL DEFAULT 'TRAINING',
  "is_published" boolean NOT NULL DEFAULT false,
  "is_featured" boolean NOT NULL DEFAULT false,
  "contains_bad_words" boolean NOT NULL DEFAULT false,
  "flagged_reason" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "fk_feedback_registration" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_feedback_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_feedback_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_feedback_registration_id" ON "feedback"("registration_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_user_id" ON "feedback"("user_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_session_id" ON "feedback"("session_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_is_published" ON "feedback"("is_published");
CREATE INDEX IF NOT EXISTS "idx_feedback_is_featured" ON "feedback"("is_featured");
CREATE INDEX IF NOT EXISTS "idx_feedback_rating" ON "feedback"("rating");
CREATE INDEX IF NOT EXISTS "idx_feedback_created_at" ON "feedback"("created_at");
CREATE INDEX IF NOT EXISTS "idx_feedback_contains_bad_words" ON "feedback"("contains_bad_words");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_feedback_registration_type_unique"
  ON "feedback"("registration_id", "feedback_type");

-- Update trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trigger_feedback_updated_at" ON "feedback";

CREATE TRIGGER "trigger_feedback_updated_at"
BEFORE UPDATE ON "feedback"
FOR EACH ROW
EXECUTE FUNCTION update_feedback_timestamp();
