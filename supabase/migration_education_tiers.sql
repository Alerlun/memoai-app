-- ============================================================
-- MemoAI Education Tiers — Database Migration
-- Run in: supabase.com → SQL Editor
-- Run AFTER migration_education.sql has been applied.
-- ============================================================

ALTER TABLE public.education_groups
  ADD COLUMN IF NOT EXISTS plan_type    text    CHECK (plan_type IN ('class', 'school')) NOT NULL DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 30;

-- Backfill existing groups (assume class plan for any created before tiers)
UPDATE public.education_groups
  SET plan_type = 'class', max_students = 30
  WHERE plan_type IS NULL OR max_students IS NULL;

SELECT 'Education tiers migration complete ✓' AS status;
