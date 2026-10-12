UPDATE trainings SET currency = 'TND' WHERE currency IS NULL OR currency <> 'TND';
UPDATE sessions SET currency = 'TND' WHERE currency IS NULL OR currency <> 'TND';
UPDATE registrations SET currency = 'TND' WHERE currency IS NULL OR currency <> 'TND';
UPDATE payments SET currency = 'TND' WHERE currency IS NULL OR currency <> 'TND';

ALTER TABLE trainings ALTER COLUMN currency SET DEFAULT 'TND';
ALTER TABLE sessions ALTER COLUMN currency SET DEFAULT 'TND';
ALTER TABLE registrations ALTER COLUMN currency SET DEFAULT 'TND';
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'TND';