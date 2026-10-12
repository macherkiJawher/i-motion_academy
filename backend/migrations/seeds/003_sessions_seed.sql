-- Seed: representative upcoming sessions for local development.
INSERT INTO "sessions" (
  training_id, trainer_name, location_name, city, mode,
  start_date, end_date, start_time, end_time, capacity, seats_taken,
  status, price, currency, certification
)
SELECT
  t.id, 'Léa Farhat', 'i-Motion Ennasr', 'Ennasr', 'On-site',
  CURRENT_DATE + 14, CURRENT_DATE + 15, '09:00', '17:00', 12, 4,
  'OPEN', t.price, t.currency, t.certification
FROM trainings t
WHERE t.slug = 'ems-foundation'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.training_id = t.id AND s.start_date = CURRENT_DATE + 14
  );

INSERT INTO "sessions" (
  training_id, trainer_name, location_name, city, mode,
  start_date, end_date, start_time, end_time, capacity, seats_taken,
  status, price, currency, certification
)
SELECT
  t.id, 'Yanis Kader', 'Live online', 'Remote', 'Live online',
  CURRENT_DATE + 28, CURRENT_DATE + 31, '10:00', '16:00', 20, 16,
  'ALMOST_FULL', t.price, t.currency, t.certification
FROM trainings t
WHERE t.slug = 'ai-motion-analytics'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.training_id = t.id AND s.start_date = CURRENT_DATE + 28
  );
