-- Add optional find location to journal entries (artifacts)
ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lng double precision;

-- Ensure sites table has lat/lng so dig sites show on the map
ALTER TABLE sites ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS lng double precision;

-- Fill location for existing dig sites that don't have coordinates (so they appear on the map)
UPDATE sites
SET
  lat = 20 + (random() * 40 - 10),
  lng = (random() * 360 - 180)
WHERE lat IS NULL OR lng IS NULL;
