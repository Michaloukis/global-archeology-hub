-- Public vs Exclusive Map (chief-only) visibility for sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Ensure existing sites are public so everyone still sees them
UPDATE sites SET is_public = true WHERE is_public IS NULL;

-- Optional: insert a few public sites (visible to everyone) for testing
-- Uncomment and run if you want seed data:
/*
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public)
VALUES
  ('Giza Plateau', 29.9792, 31.1342, 'Home to the Great Pyramid of Giza and the Great Sphinx.', 'https://artsandculture.google.com/project/giza-pyramids', 'In Progress', true),
  ('Acropolis of Athens', 37.9715, 23.7257, 'Ancient citadel with the Parthenon.', 'https://www.acropolis-virtualtour.gr/', 'Finished', true),
  ('Stonehenge', 51.1789, -1.8262, 'Prehistoric monument in Wiltshire, England.', 'https://www.english-heritage.org.uk/visit/places/stonehenge/', 'Finished', true);
*/

-- To make some of YOUR sites Exclusive Map only (visible only when you're logged in as Chief):
-- Replace YOUR_CHIEF_USER_UUID with your actual profile id from auth.users or profiles.
-- UPDATE sites SET is_public = false WHERE created_by = 'YOUR_CHIEF_USER_UUID' AND name IN ('My Private Dig', 'Another Private Site');
