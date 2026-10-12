BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "sessions" AS session
    JOIN (
      SELECT "session_id", COUNT(*) AS active_count
      FROM "registrations"
      WHERE "status" <> 'CANCELLED'
      GROUP BY "session_id"
    ) AS registrations ON registrations."session_id" = session."id"
    WHERE registrations.active_count > session."capacity"
  ) THEN
    RAISE EXCEPTION 'At least one session has more active registrations than its capacity; reconcile those records before applying this migration';
  END IF;
END $$;

UPDATE "sessions" AS session
SET
  "seats_taken" = COALESCE(registrations.active_count, 0),
  "status" = CASE
    WHEN session."status" = 'CLOSED' THEN 'CLOSED'::session_status
    WHEN COALESCE(registrations.active_count, 0) >= session."capacity" THEN 'FULL'::session_status
    WHEN COALESCE(registrations.active_count, 0) >= session."capacity" * 0.8 THEN 'ALMOST_FULL'::session_status
    ELSE 'OPEN'::session_status
  END
FROM (
  SELECT "session_id", COUNT(*) AS active_count
  FROM "registrations"
  WHERE "status" <> 'CANCELLED'
  GROUP BY "session_id"
) AS registrations
WHERE registrations."session_id" = session."id";

UPDATE "sessions"
SET
  "seats_taken" = 0,
  "status" = CASE
    WHEN "status" = 'CLOSED' THEN 'CLOSED'::session_status
    ELSE 'OPEN'::session_status
  END
WHERE "id" NOT IN (SELECT "session_id" FROM "registrations" WHERE "status" <> 'CANCELLED');

ALTER TABLE "sessions"
  DROP CONSTRAINT IF EXISTS sessions_schedule_times_valid;

ALTER TABLE "sessions"
  ADD CONSTRAINT sessions_schedule_times_valid CHECK (
    "end_date" > "start_date"
    OR ("end_date" = "start_date" AND "end_time" > "start_time")
  );

COMMIT;
