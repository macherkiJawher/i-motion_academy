ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "concerned_name" varchar(200) NULL;
ALTER TABLE "complaints" DROP CONSTRAINT IF EXISTS "complaint_category_valid";
ALTER TABLE "complaints" ADD CONSTRAINT "complaint_category_valid"
  CHECK ("category" IN ('REGISTRATION','PAYMENT','SESSION','TRAINING','TRAINER','CERTIFICATE','OTHER'));

CREATE TABLE IF NOT EXISTS "complaint_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "complaint_id" uuid NOT NULL REFERENCES "complaints"("id") ON DELETE CASCADE,
  "uploaded_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "original_name" varchar(255) NOT NULL,
  "storage_name" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size_bytes" integer NOT NULL CHECK ("size_bytes" > 0),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "complaint_attachments_complaint_idx" ON "complaint_attachments" ("complaint_id", "created_at");
