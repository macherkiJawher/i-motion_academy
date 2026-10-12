-- Remove TRAINER as an authenticated user role.
-- Trainer profiles remain a separate future domain concept.
UPDATE "users"
SET "role" = 'PARTICIPANT'
WHERE "role" = 'TRAINER';
