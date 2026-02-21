-- Seed: public, student, and exclusive sites + artifacts
-- Run after add-visibility.sql and add-coordinates.sql. Ensures visibility column exists.

-- Optional: allow NULL created_by for seed private sites (if your RLS allows)
-- Exclusive Map shows private sites where created_by = current user; seed private site won't show until you assign it.

-- 1) Public sites (everyone) – run once; skip if you already have these
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Giza Plateau', 29.9792, 31.1342, 'Home to the Great Pyramid of Giza and the Great Sphinx.', 'https://artsandculture.google.com/project/giza-pyramids', 'In Progress', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Giza Plateau');
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Acropolis of Athens', 37.9715, 23.7257, 'Ancient citadel with the Parthenon.', 'https://www.acropolis-virtualtour.gr/', 'Finished', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Acropolis of Athens');
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Stonehenge', 51.1789, -1.8262, 'Prehistoric monument in Wiltshire, England.', 'https://www.english-heritage.org.uk/visit/places/stonehenge/', 'Finished', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Stonehenge');

-- 2) Student-only sites (students + chiefs + field archeologists; use filter "Students (public + student)")
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Roman Forum (Student Lab)', 41.8925, 12.4854, 'Student curriculum site: Roman Forum and Via Sacra.', 'https://artsandculture.google.com/streetview/roman-forum/2wE2Mv_7nOwaTw', 'In Progress', false, 'student'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Roman Forum (Student Lab)');
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Knossos (Student Lab)', 35.2982, 25.1632, 'Student curriculum site: Minoan palace complex.', 'https://www.google.com/maps/about/behind-the-scenes/streetview/treks/knossos/', 'In Progress', false, 'student'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Knossos (Student Lab)');

-- 3) Exclusive (chief-only) site: visible only on Exclusive Map when created_by matches a chief. Set created_by to your chief user UUID to see it.
INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility, created_by)
SELECT 'Chief Exclusive Dig', 34.0522, -118.2437, 'Exclusive Map only. Assign created_by to your Chief user UUID to see it.', NULL, 'In Progress', false, 'private', NULL
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Chief Exclusive Dig');

-- 4) Public artifacts (journal entries) – attach to first public site
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id, 'Sample public find', 'Public dispatch for map demo.', s.lat + 0.01, s.lng + 0.01, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Giza Plateau' LIMIT 1;

-- 5) Student-only artifacts
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id, 'Student lab find', 'Curriculum artifact (students + archeologists).', s.lat + 0.01, s.lng + 0.01, 'student', false
FROM sites s WHERE s.visibility = 'student' AND s.name = 'Roman Forum (Student Lab)' LIMIT 1;

-- 6) Optional: one more student artifact at Knossos
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id, 'Minoan sherd (student)', 'Student-only record.', s.lat - 0.005, s.lng + 0.005, 'student', false
FROM sites s WHERE s.visibility = 'student' AND s.name = 'Knossos (Student Lab)' LIMIT 1;
