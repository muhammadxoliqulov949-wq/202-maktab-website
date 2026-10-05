-- ============================================================================
-- 202-maktab — Phase 4: real authentication & authorization
--
-- Adds:
--   1. admin_roles          — database-backed role → permission catalogue
--   2. admin_users          — links a Supabase Auth user (auth.users.id) to a role
--   3. admin_audit_logs     — real admin identity columns + append-only trigger
--   4. media_assets         — uploader attribution
--   5. RLS policies         — self-read for admin_users, admin-only role catalogue
--   6. Storage policies     — public read, active-admin write on bucket `media`
--
-- Idempotent: safe to re-run, and safe to run on a database where an earlier
-- attempt of this file failed part-way (every object is created with
-- `if not exists`, every trigger/policy/constraint is dropped before it is
-- recreated). It is also safe on a clean Phase 3 database.
--
-- Validated against the real PostgreSQL grammar by `node scripts/check-sql.mjs`
-- (wired into `npm test`). An earlier revision used
-- `references admin_roles (role) on restrict`, which PostgreSQL rejects
-- (`ON RESTRICT` is not a foreign-key action) — see the guard tests.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_roles — role → permissions.
--    Handlers ask for a PERMISSION, never for a role name, so adding
--    `editor`/`viewer` later is a data change, not a code change.
-- ---------------------------------------------------------------------------
create table if not exists admin_roles (
  role        text primary key,
  description text,
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Seed the built-in `admin` role.
-- `on conflict do nothing` (not `do update`) is deliberate: the catalogue is
-- operator-owned once seeded, so re-running this migration must never clobber
-- a permission list someone has since edited. Add roles with INSERT, adjust
-- them with UPDATE.
insert into admin_roles (role, description, permissions)
values (
  'admin',
  'Full administrative access to the 202-maktab CMS.',
  array[
    'dashboard.read',
    'content.read', 'content.write',
    'inbox.read', 'inbox.write',
    'audit.read',
    'media.read', 'media.write',
    'settings.read', 'settings.write',
    'admin.manage'
  ]
)
on conflict (role) do nothing;

-- ---------------------------------------------------------------------------
-- 2. admin_users — one row per authorized administrator.
--    `user_id` is the Supabase Auth UUID (auth.users.id). Passwords are NEVER
--    stored here: credential verification is delegated entirely to GoTrue.
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique,
  email         text not null unique,
  role          text not null default 'admin',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- Foreign keys are applied as explicit, named constraints (rather than inline in
-- CREATE TABLE) so that the migration still converges if `admin_users` already
-- existed from a previous, partially applied run.
-- `on delete restrict` is the valid PostgreSQL form; `on restrict` is a syntax
-- error and was the bug in the first revision of this file.
alter table admin_users drop constraint if exists admin_users_user_id_fkey;
alter table admin_users
  add constraint admin_users_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- A role that is still assigned cannot be deleted (RESTRICT, not CASCADE):
-- revoking access must stay an explicit `is_active`/reassignment operation.
alter table admin_users drop constraint if exists admin_users_role_fkey;
alter table admin_users
  add constraint admin_users_role_fkey
  foreign key (role) references admin_roles (role) on delete restrict;

create index if not exists idx_admin_users_user_id on admin_users (user_id);
create index if not exists idx_admin_users_email on admin_users (lower(email));

-- updated_at maintenance
create or replace function set_admin_users_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_admin_users_updated_at on admin_users;
create trigger trg_admin_users_updated_at
  before update on admin_users
  for each row execute function set_admin_users_updated_at();

-- ---------------------------------------------------------------------------
-- 3. admin_audit_logs — attach the real authenticated identity.
--    `admin_identifier` is preserved (Phase 3 rows keep their value).
-- ---------------------------------------------------------------------------
alter table admin_audit_logs add column if not exists admin_user_id uuid;
alter table admin_audit_logs add column if not exists admin_email text;
alter table admin_audit_logs add column if not exists ip_address text;

-- Deliberately NO foreign key from admin_user_id to auth.users: an audit journal
-- must outlive the account it records. Deleting an Auth user must never be able
-- to cascade away history, so the column keeps the UUID as a value of record.
create index if not exists idx_audit_admin_user on admin_audit_logs (admin_user_id);

comment on column admin_audit_logs.admin_user_id is
  'Phase 4: auth.users.id of the authenticated administrator (null for anonymous/failed attempts).';
comment on column admin_audit_logs.admin_email is
  'Admin email for successful actions; a sha256: prefix for failed logins, so this table is never an address list.';

-- Append-only journal: nobody (not even an admin) may rewrite history.
-- The table owner (postgres, used by migrations and the dashboard SQL editor)
-- is intentionally exempt so operators can still perform maintenance.
create or replace function admin_audit_logs_is_append_only()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'admin_audit_logs is append-only: % is not permitted', tg_op;
end $$;

drop trigger if exists trg_admin_audit_logs_no_update on admin_audit_logs;
create trigger trg_admin_audit_logs_no_update
  before update on admin_audit_logs
  for each row execute function admin_audit_logs_is_append_only();

drop trigger if exists trg_admin_audit_logs_no_delete on admin_audit_logs;
create trigger trg_admin_audit_logs_no_delete
  before delete on admin_audit_logs
  for each row execute function admin_audit_logs_is_append_only();

-- ---------------------------------------------------------------------------
-- 4. media_assets — who uploaded it
--    Same explicit-constraint pattern as admin_users, for convergence.
-- ---------------------------------------------------------------------------
alter table media_assets add column if not exists uploaded_by uuid;

alter table media_assets drop constraint if exists media_assets_uploaded_by_fkey;
alter table media_assets
  add constraint media_assets_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
--
-- The Phase 3 model is kept: content tables stay default-deny for anon and
-- authenticated PostgREST clients; the public site reads through /api/v1/*.
-- Phase 4 adds narrowly-scoped policies for the two new auth tables only.
-- ---------------------------------------------------------------------------
alter table admin_roles enable row level security;
alter table admin_users enable row level security;

-- A signed-in Supabase user may read their OWN admin record (self-service
-- "am I an admin / what is my role" without the service key).
drop policy if exists admin_users_select_self on admin_users;
create policy admin_users_select_self on admin_users
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Only an ACTIVE administrator may read the role/permission catalogue.
drop policy if exists admin_roles_select_active_admin on admin_roles;
create policy admin_roles_select_active_admin on admin_roles
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

comment on table admin_users is
  'ADMIN-ONLY. Links auth.users.id to a role. No anon policies; self-select only for the owning user.';
comment on table admin_roles is
  'ADMIN-ONLY role/permission catalogue. Readable only by active administrators.';
comment on table admin_audit_logs is
  'ADMIN-ONLY, append-only (trigger-enforced). Only the service role (API server) writes it.';

-- ---------------------------------------------------------------------------
-- 6. Storage policies — bucket `media`
--    Reads stay public (the bucket is public: the site embeds these URLs).
--    Writes/updates/deletes require an ACTIVE admin_users row for the JWT's sub.
-- ---------------------------------------------------------------------------
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select
  using (bucket_id = 'media');

drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );
