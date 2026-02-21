-- Ceramic piece count per dig site (from field counter tool)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ceramic_count integer;

-- Optional: backfill existing sites with 0 if you want a default
-- UPDATE sites SET ceramic_count = 0 WHERE ceramic_count IS NULL;
