-- Seed: presentation-ready public, student, and exclusive sites + field records
-- Run after add-visibility.sql and add-coordinates.sql (visibility column must exist).
-- For Exclusive Map: after running, set sites.created_by to your Chief user UUID for "Valley of the Kings (Chief)" so it appears when you're logged in as Chief.

-- =============================================================================
-- 1) PUBLIC SITES (visible to everyone)
-- =============================================================================

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Giza Plateau', 29.9792, 31.1342,
  'UNESCO World Heritage Site. Home to the Great Pyramid of Giza, the Great Sphinx, and associated complexes. Ongoing conservation and research by international teams.',
  'https://artsandculture.google.com/project/giza-pyramids', 'In Progress', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Giza Plateau');

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Acropolis of Athens', 37.9715, 23.7257,
  'Ancient citadel overlooking Athens. The Parthenon and surrounding monuments are among the most significant remains of Classical Greece. Continuous study and restoration.',
  'https://www.acropolis-virtualtour.gr/', 'Finished', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Acropolis of Athens');

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Stonehenge', 51.1789, -1.8262,
  'Prehistoric stone circle in Wiltshire, England. Alignments and burial mounds provide evidence of ritual and astronomical use. Managed by English Heritage.',
  'https://www.english-heritage.org.uk/visit/places/stonehenge/', 'Finished', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Stonehenge');

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Pompeii', 40.7502, 14.4897,
  'Roman city preserved by the eruption of Vesuvius (AD 79). Excavations reveal streets, houses, and public buildings. Ongoing fieldwork and conservation.',
  'https://www.pompeiisites.org/', 'In Progress', true, 'public'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Pompeii');

-- =============================================================================
-- 2) STUDENT-ONLY SITES (students + chiefs + field archeologists; filter: "Students (public + student)")
-- =============================================================================

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Roman Forum (Student Lab)', 41.8925, 12.4854,
  'Curriculum site: Roman Forum and Via Sacra. Used for teaching Roman architecture, epigraphy, and urban layout. Virtual tour and guided activities available.',
  'https://artsandculture.google.com/streetview/roman-forum/2wE2Mv_7nOwaTw', 'In Progress', false, 'student'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Roman Forum (Student Lab)');

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility)
SELECT 'Knossos (Student Lab)', 35.2982, 25.1632,
  'Curriculum site: Minoan palace complex on Crete. Introduces Bronze Age Aegean archaeology, stratigraphy, and ceramic typology. Street View trek available.',
  'https://www.google.com/maps/about/behind-the-scenes/streetview/treks/knossos/', 'In Progress', false, 'student'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Knossos (Student Lab)');

-- =============================================================================
-- 3) EXCLUSIVE (CHIEF-ONLY) SITE – visible only on Exclusive Map when created_by = current user
-- After seed: UPDATE sites SET created_by = 'YOUR_CHIEF_USER_UUID' WHERE name = 'Valley of the Kings (Chief)';
-- =============================================================================

INSERT INTO sites (name, lat, lng, description, "tourUrl", status, is_public, visibility, created_by)
SELECT 'Valley of the Kings (Chief)', 25.7402, 32.6014,
  'Chief-only expedition site. Sensitive location data and ongoing survey. Assign created_by to your Chief profile UUID in Supabase to see it on the Exclusive Map.',
  NULL, 'In Progress', false, 'private', NULL
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE name = 'Valley of the Kings (Chief)');

-- =============================================================================
-- 4) PUBLIC FIELD RECORDS (site_journals) – professional presentation text
-- user_id: omitted so it may be NULL; if your schema requires it, run:
--   UPDATE site_journals SET user_id = (SELECT id FROM profiles LIMIT 1) WHERE user_id IS NULL;
-- =============================================================================

-- Giza: two public records
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Limestone block with quarry mark (sector G-4000)',
  'Documented in situ near the eastern perimeter. Photographed and measured; block matches known Old Kingdom quarrying technique. Catalog ref: GZ-2024-012.',
  s.lat + 0.008, s.lng + 0.012, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Giza Plateau' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Limestone block with quarry mark (sector G-4000)');

INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Ceramic sherds (Old Kingdom domestic)',
  'Surface collection from designated grid. Preliminary ID: bread moulds and storage jars. Sent for ceramic analysis. Context recorded for GIS.',
  s.lat - 0.005, s.lng + 0.008, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Giza Plateau' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Ceramic sherds (Old Kingdom domestic)');

-- Acropolis: one public record
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Fragment of Pentelic marble (possible cornice)',
  'Recovered during controlled clearance. Dimensions and join study suggest association with Propylaia phase. Stored on-site; inventory updated.',
  s.lat + 0.002, s.lng - 0.003, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Acropolis of Athens' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Fragment of Pentelic marble (possible cornice)');

-- Stonehenge: one public record
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Worked sarsen fragment (context Trench 7)',
  'Small fragment with clear tooling. Recorded with total station; context logged for chronology. Part of ongoing landscape survey.',
  s.lat + 0.004, s.lng + 0.002, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Stonehenge' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Worked sarsen fragment (context Trench 7)');

-- Pompeii: two public records
INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Fresco fragment (Insula VI)',
  'Pigment and plaster fragment from collapse layer. In situ photo and 3D scan completed. Conservation assessment pending.',
  s.lat + 0.003, s.lng + 0.005, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Pompeii' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Fresco fragment (Insula VI)');

INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Amphora stamp (Latin script)',
  'Rim fragment with stamp; preliminary reading suggests Italian origin. Cross-referenced with CIL; full epigraphic note to follow.',
  s.lat - 0.002, s.lng + 0.004, 'public', true
FROM sites s WHERE s.visibility = 'public' AND s.name = 'Pompeii' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Amphora stamp (Latin script)');

-- =============================================================================
-- 5) STUDENT-ONLY FIELD RECORDS (curriculum examples)
-- =============================================================================

INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Republican-era paving stone (Via Sacra)',
  'Curriculum example: students use this point for mapping and orientation exercise. Accompanying worksheet: Roman road construction and dating.',
  s.lat + 0.006, s.lng + 0.004, 'student', false
FROM sites s WHERE s.visibility = 'student' AND s.name = 'Roman Forum (Student Lab)' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Republican-era paving stone (Via Sacra)');

INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Minoan ceramic sherd (palace-style)',
  'Student lab find: used for ceramic identification and drawing. Typology: MM III–LM I. Linked to Knossos pottery curriculum module.',
  s.lat - 0.005, s.lng + 0.005, 'student', false
FROM sites s WHERE s.visibility = 'student' AND s.name = 'Knossos (Student Lab)' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Minoan ceramic sherd (palace-style)');

INSERT INTO site_journals (site_id, findings, notes, lat, lng, visibility, is_public)
SELECT s.id,
  'Column base (Roman Forum)',
  'Curriculum: architectural element for measurement and proportion exercise. Students record dimensions and compare with canonical orders.',
  s.lat - 0.003, s.lng - 0.002, 'student', false
FROM sites s WHERE s.visibility = 'student' AND s.name = 'Roman Forum (Student Lab)' LIMIT 1
AND NOT EXISTS (SELECT 1 FROM site_journals j WHERE j.site_id = s.id AND j.findings = 'Column base (Roman Forum)');

-- =============================================================================
-- OPTIONAL: Backfill user_id if your site_journals table requires it (uncomment and set YOUR_PROFILE_UUID)
-- =============================================================================
-- UPDATE site_journals SET user_id = 'YOUR_PROFILE_UUID' WHERE user_id IS NULL;
