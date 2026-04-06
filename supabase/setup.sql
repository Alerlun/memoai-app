-- ============================================================
-- MemoAI — Supabase Database Setup
-- Run this entire file once in: supabase.com → SQL Editor
-- ============================================================

-- ── 1. Profiles table ─────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid references auth.users(id) on delete cascade primary key,
  full_name          text,
  is_pro             boolean not null default false,
  stripe_customer_id text unique,
  pro_expires_at     timestamptz,
  uploads_this_week  int not null default 0,
  week_reset_at      timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- If upgrading an existing deployment, run this:
-- alter table public.profiles add column if not exists pro_expires_at timestamptz;

-- RLS: users can only read/update their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 2. Study sets table ────────────────────────────────────
create table if not exists public.study_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null default 'Untitled Set',
  icon        text default '📚',
  bg          text default '#edeafd',
  fg          text default '#5b4fe9',
  flashcards  jsonb not null default '[]',
  quiz        jsonb not null default '[]',
  plan        jsonb not null default '{}',
  progress    int not null default 0,
  source_text text,
  magic_notes jsonb,
  created_at  timestamptz not null default now()
);

-- RLS: users can only access their own sets
alter table public.study_sets enable row level security;

create policy "Users can view own sets"
  on public.study_sets for select
  using (auth.uid() = user_id);

create policy "Users can insert own sets"
  on public.study_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sets"
  on public.study_sets for update
  using (auth.uid() = user_id);

create policy "Users can delete own sets"
  on public.study_sets for delete
  using (auth.uid() = user_id);

-- ── 3. Auto-create profile when user signs up ──────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. Monthly upload reset (runs via pg_cron) ──────────────
-- First enable pg_cron: Database → Extensions → enable pg_cron
-- Then run:
--
-- select cron.schedule(
--   'reset-weekly-uploads',
--   '0 0 1 * *',   -- 1st of every month at 00:00 UTC
--   $$
--     update public.profiles
--     set uploads_this_week = 0,
--         week_reset_at = now()
--     where uploads_this_week > 0
--   $$
-- );

-- ── 5. Useful indexes ──────────────────────────────────────
create index if not exists study_sets_user_id_idx on public.study_sets(user_id);
create index if not exists study_sets_created_at_idx on public.study_sets(created_at desc);
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);

-- ── Done! ──────────────────────────────────────────────────
select 'MemoAI database setup complete ✓' as status;
