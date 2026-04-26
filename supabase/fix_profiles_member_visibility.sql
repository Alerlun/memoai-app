-- Fix: educators cannot see group member names (all show as "Unknown")
-- Run this in: Supabase dashboard → SQL Editor
--
-- Root cause: profiles RLS only allows auth.uid() = id (own row only).
-- When an educator fetches all member profiles by user_id, the other rows are
-- filtered out, so full_name is null for everyone except themselves.
--
-- Fix: add a SELECT policy that lets educators see profiles of everyone
-- who shares their education_group_id. Students are unaffected (they keep
-- seeing only their own profile).

CREATE POLICY "profiles_visible_to_group_educator"
  ON public.profiles FOR SELECT
  USING (
    education_group_id IN (
      SELECT education_group_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'educator'
        AND education_group_id IS NOT NULL
    )
  );
