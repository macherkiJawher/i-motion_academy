-- Migration: create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "email" varchar(200) NOT NULL UNIQUE,
  "password" varchar(255),
  "phone" varchar(40),
  "role" varchar(32) NOT NULL DEFAULT 'PARTICIPANT',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "avatar_url" varchar(1024)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON "users" (email);
