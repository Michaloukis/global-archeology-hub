# Supabase migrations

Run these in the **Supabase Dashboard → SQL Editor** in a sensible order.

## Order (schema first, then seed)

1. **Schema / columns**: `add-coordinates.sql`, `add-visibility.sql`, `add-public-sites.sql`, `add-profiles-avatar.sql`, `add-profiles-settings.sql`, `add-social-chatrooms.sql`, `add-ceramic-count.sql`
2. **Policies**: `add-profiles-select-authenticated.sql`, `add-chatrooms-select-authenticated.sql`
3. **Seed (presentation-ready data)**: `seed-public-student-exclusive.sql`

## Presentation seed (`seed-public-student-exclusive.sql`)

- **Public sites**: Giza Plateau, Acropolis of Athens, Stonehenge, Pompeii — with clear descriptions and status.
- **Student sites**: Roman Forum (Student Lab), Knossos (Student Lab) — curriculum-oriented.
- **Exclusive (Chief-only) site**: Valley of the Kings (Chief). It appears on the **Exclusive Map** only when `created_by` matches the logged-in Chief. After running the seed, run:
  ```sql
  UPDATE sites SET created_by = 'YOUR_CHIEF_USER_UUID' WHERE name = 'Valley of the Kings (Chief)';
  ```
  Replace `YOUR_CHIEF_USER_UUID` with your Chief profile `id` from the `profiles` table.

- **Field records** (`site_journals`): Professional-style findings and notes for each site (e.g. limestone block, ceramic sherds, fresco fragment, amphora stamp, student curriculum examples). If your `site_journals` table has `user_id` NOT NULL, run:
  ```sql
  UPDATE site_journals SET user_id = (SELECT id FROM profiles LIMIT 1) WHERE user_id IS NULL;
  ```

## Storage

- Create a **Public** bucket named `field-records` (Journal Terminal uploads).
- Avatar bucket as used by the app (see main README).
