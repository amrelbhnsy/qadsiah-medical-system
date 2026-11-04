-- Qadsiah U18: isolated, additive clinic foundation.
-- REVIEW BEFORE APPLYING. Does not alter legacy tables or existing players.
-- Requires Supabase Auth and staff membership provisioning by a trusted administrator.
create extension if not exists pgcrypto;

create table if not exists public.qd_clinic_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('physio','doctor','admin')),
  active boolean not null default true
);

create table if not exists public.qd_clinic_episodes (
  id uuid primary key default gen_random_uuid(),
  player_external_id text not null,
  anatomical_region text not null,
  body_side text not null default 'unspecified'
    check (body_side in ('left','right','bilateral','midline','unspecified')),
  complaint_type text not null,
  diagnosis_text text,
  diagnosis_code text,
  status text not null default 'open' check (status in ('open','monitoring','resolved')),
  onset_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qd_clinic_region_nonblank check (length(trim(anatomical_region)) > 0),
  constraint qd_clinic_player_nonblank check (length(trim(player_external_id)) > 0)
);

create table if not exists public.qd_clinic_visits (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.qd_clinic_episodes(id) on delete restrict,
  visited_at timestamptz not null default now(),
  pain_nrs integer check (pain_nrs between 0 and 10),
  treatment_type text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  participation_clearance text not null default 'pending'
    check (participation_clearance in ('full','modified','no','pending')),
  follow_up_required boolean not null default false,
  clinical_notes text,
  session_external_id text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists qd_clinic_episodes_player_idx
  on public.qd_clinic_episodes(player_external_id,status);
create index if not exists qd_clinic_visits_episode_date_idx
  on public.qd_clinic_visits(episode_id,visited_at desc);

alter table public.qd_clinic_staff enable row level security;
alter table public.qd_clinic_episodes enable row level security;
alter table public.qd_clinic_visits enable row level security;

-- Users may only inspect their own membership; no client-side staff provisioning.
drop policy if exists qd_clinic_staff_self_read on public.qd_clinic_staff;
create policy qd_clinic_staff_self_read on public.qd_clinic_staff
  for select to authenticated using (user_id = (select auth.uid()));

-- Clinical records: active authorized medical staff only.
drop policy if exists qd_clinic_episodes_staff_select on public.qd_clinic_episodes;
create policy qd_clinic_episodes_staff_select on public.qd_clinic_episodes
  for select to authenticated using (
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  );
drop policy if exists qd_clinic_episodes_staff_insert on public.qd_clinic_episodes;
create policy qd_clinic_episodes_staff_insert on public.qd_clinic_episodes
  for insert to authenticated with check (
    created_by = (select auth.uid()) and
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  );
drop policy if exists qd_clinic_episodes_staff_update on public.qd_clinic_episodes;
create policy qd_clinic_episodes_staff_update on public.qd_clinic_episodes
  for update to authenticated using (
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  ) with check (
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  );

drop policy if exists qd_clinic_visits_staff_select on public.qd_clinic_visits;
create policy qd_clinic_visits_staff_select on public.qd_clinic_visits
  for select to authenticated using (
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  );
drop policy if exists qd_clinic_visits_staff_insert on public.qd_clinic_visits;
create policy qd_clinic_visits_staff_insert on public.qd_clinic_visits
  for insert to authenticated with check (
    created_by = (select auth.uid()) and
    exists (select 1 from public.qd_clinic_staff s
      where s.user_id = (select auth.uid()) and s.active)
  );

-- Do not grant DELETE to application users. Existing tables are untouched.
revoke delete on public.qd_clinic_episodes, public.qd_clinic_visits from anon, authenticated;
-- IMPORTANT: Validate the legacy player-ID mapping, existing Auth/RLS and grants
-- in a staging Supabase project before deploying this migration.
