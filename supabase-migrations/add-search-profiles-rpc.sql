-- Reliable people search for Social Hub (Direct/Group).
-- Run in Supabase SQL Editor. Call from app: supabase.rpc('search_profiles', { search_term: 'field2' }).
-- Uses COALESCE so null full_name/username still match (e.g. search by id or future email).

CREATE OR REPLACE FUNCTION public.search_profiles(search_term text)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT *
  FROM profiles
  WHERE auth.uid() IS NOT NULL
    AND id != auth.uid()
    AND (
      COALESCE(trim(full_name), '') ILIKE '%' || trim(search_term) || '%'
      OR COALESCE(trim(username), '') ILIKE '%' || trim(search_term) || '%'
    )
  ORDER BY COALESCE(full_name, username, '') ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO service_role;
