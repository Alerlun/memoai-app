-- ============================================================
-- MemoAI Education — Database Migration
-- Run this in: supabase.com → SQL Editor
-- Run AFTER setup.sql has already been applied.
-- ============================================================

-- ── 1. Add education columns to profiles ──────────────────────
alter table public.profiles
  add column if not exists role text check (role in ('student', 'educator')),
  add column if not exists is_education boolean not null default false,
  add column if not exists education_group_id uuid;

-- ── 2. Education groups (one per $200/mo subscription) ────────
create table if not exists public.education_groups (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  owner_id               uuid not null references auth.users(id) on delete restrict,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  join_code              text unique not null,
  is_active              boolean not null default false,
  expires_at             timestamptz,
  created_at             timestamptz not null default now()
);

-- Now we can add the FK from profiles to education_groups
alter table public.profiles
  add constraint profiles_education_group_id_fkey
    foreign key (education_group_id) references public.education_groups(id)
    on delete set null;

-- ── 3. Education group members ────────────────────────────────
create table if not exists public.education_members (
  group_id  uuid not null references public.education_groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null check (role in ('educator', 'student')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ── 4. Row-level security ──────────────────────────────────────
alter table public.education_groups enable row level security;
alter table public.education_members enable row level security;

-- Group owner has full access to their group
create policy "edu_groups_owner_all"
  on public.education_groups for all
  using (auth.uid() = owner_id);

-- Group members can read their group
create policy "edu_groups_member_select"
  on public.education_groups for select
  using (
    exists (
      select 1 from public.education_members
      where group_id = education_groups.id
        and user_id = auth.uid()
    )
  );

-- Public: anyone can read a group by join_code to validate it before joining
create policy "edu_groups_public_select_by_code"
  on public.education_groups for select
  using (true);

-- Group owner can manage all members
create policy "edu_members_owner_all"
  on public.education_members for all
  using (
    exists (
      select 1 from public.education_groups
      where id = group_id
        and owner_id = auth.uid()
    )
  );

-- Members can read and delete their own membership row
create policy "edu_members_self_select"
  on public.education_members for select
  using (auth.uid() = user_id);

create policy "edu_members_self_delete"
  on public.education_members for delete
  using (auth.uid() = user_id);

-- ── 5. Indexes ────────────────────────────────────────────────
create index if not exists edu_groups_join_code_idx on public.education_groups(join_code);
create index if not exists edu_groups_owner_id_idx  on public.education_groups(owner_id);
create index if not exists edu_groups_sub_id_idx    on public.education_groups(stripe_subscription_id);
create index if not exists edu_members_user_id_idx  on public.education_members(user_id);
create index if not exists profiles_edu_group_idx   on public.profiles(education_group_id);

-- ── Done! ──────────────────────────────────────────────────────
select 'MemoAI Education migration complete ✓' as status;
