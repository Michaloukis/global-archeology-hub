-- Add optional find location to journal entries (artifacts)
ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lng double precision;

-- Add random coordinates to existing sites that have NULL lat/lng (for testing)
-- Run this only if your sites table has rows with missing coordinates.
UPDATE sites
SET
  lat = 20 + (random() * 40 - 10),
  lng = (random() * 360 - 180)
WHERE lat IS NULL OR lng IS NULL;
