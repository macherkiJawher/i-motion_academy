-- Seed: representative public training catalogue for local development.
INSERT INTO "trainings" (
  slug, title, axis_code, tagline, description, level, duration_hours,
  price, currency, certification, target_audience, prerequisites, skills,
  program, cover_url, rating, learners, active
)
VALUES
  (
    'ems-foundation',
    'EMS Foundation',
    'EMS',
    'Your entry into the impulse era.',
    'The essential first certification for safe suit handling and basic protocols.',
    'Foundation', 16, 390, 'EUR', 'EMS Foundation Certificate',
    'Coaches and studio staff starting with EMS', 'None',
    '["Suit handling", "Basic protocols", "Onboarding", "Hygiene", "Safety"]'::jsonb,
    '[{"title":"Suit Anatomy","detail":"Every channel, strap and failure mode.","hours":4}]'::jsonb,
    '', 4.8, 4310, true
  ),
  (
    'ai-motion-analytics',
    'AI Motion Analytics',
    'AI',
    'Read movement like a machine does.',
    'Use pose estimation, sensor data and AI dashboards to quantify technique and progression.',
    'Master', 32, 1180, 'EUR', 'AI Motion Analyst Certificate',
    'Coaches, analysts and studio tech leads', 'Comfort with basic data tools',
    '["Pose estimation", "Sensor fusion", "Data hygiene", "AI reporting", "Ethics"]'::jsonb,
    '[{"title":"Capture Stack","detail":"Cameras, IMUs and what each one lies about.","hours":8}]'::jsonb,
    '', 4.9, 860, true
  )
ON CONFLICT (slug) DO NOTHING;
