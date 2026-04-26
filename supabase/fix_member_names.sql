-- Step 1: Drop the broken policy that caused profiles 500 errors
-- (self-referencing RLS subquery → infinite recursion)
DROP POLICY IF EXISTS "profiles_visible_to_group_educator" ON public.profiles;

-- Step 2: Create a SECURITY DEFINER function that bypasses RLS internally.
-- The caller must be the group owner (checked inside); no RLS recursion possible.
CREATE OR REPLACE FUNCTION get_education_group_members(p_group_id uuid)
RETURNS TABLE(user_id uuid, member_role text, joined_at timestamptz, full_name text)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT em.user_id, em.role, em.joined_at, pr.full_name
  FROM public.education_members em
  LEFT JOIN public.profiles pr ON pr.id = em.user_id
  WHERE em.group_id = p_group_id
    AND EXISTS (
      SELECT 1 FROM public.education_groups eg
      WHERE eg.id = p_group_id AND eg.owner_id = auth.uid()
    )
  ORDER BY em.joined_at ASC;
$$;
