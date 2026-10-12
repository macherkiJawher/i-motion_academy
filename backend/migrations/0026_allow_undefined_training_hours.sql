-- Teaching hours may be unknown while a training is still being prepared.
ALTER TABLE trainings
  ALTER COLUMN duration_hours DROP NOT NULL;
