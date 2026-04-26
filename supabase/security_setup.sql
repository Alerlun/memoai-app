-- ============================================================
-- MemoAI Security Setup — run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Rate limit log table ───────────────────────────────────
-- Used by edge functions to enforce per-user request limits.
-- Only accessible via service role key (edge functions).
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_lookup
  ON public.rate_limit_log (user_id, action, created_at DESC);

-- RLS: no direct user access — service role only
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Auto-purge rows older than 24 hours to keep table small
CREATE OR REPLACE FUNCTION public.purge_old_rate_limit_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '24 hours';
$$;

-- ── 2. Restrict education_groups to authenticated users ───────
-- Previously used USING(true) which allowed unauthenticated enumeration.
DROP POLICY IF EXISTS "edu_groups_public_select_by_code" ON public.education_groups;

CREATE POLICY "edu_groups_authenticated_select"
  ON public.education_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);
