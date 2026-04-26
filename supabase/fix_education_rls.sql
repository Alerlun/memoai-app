-- Fix: circular RLS infinite-loop between education_groups ↔ education_members
-- Run this in: Supabase dashboard → SQL Editor
--
-- The loop:
--   education_groups SELECT policy "edu_groups_member_select"
--     → queries education_members
--     → education_members policy "edu_members_owner_all"
--       → queries education_groups  ← loops forever → 500
--
-- Fix 1: Drop the policy that pulls education_members into education_groups queries.
--   (It was redundant anyway — "edu_groups_public_select_by_code" with USING(true)
--   already lets every user read every group.)
DROP POLICY IF EXISTS "edu_groups_member_select" ON public.education_groups;

-- Fix 2: Rewrite edu_members_owner_all to reference profiles instead of education_groups,
--   so it no longer creates a cycle even if Fix 1 were reversed.
DROP POLICY IF EXISTS "edu_members_owner_all" ON public.education_members;

CREATE POLICY "edu_members_owner_all"
  ON public.education_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND education_group_id = group_id
        AND role = 'educator'
    )
  );
