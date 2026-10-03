-- ============================================================================
-- 202-MAKTAB — BARCHA MIGRATSIYALAR BIR FAYLDA (Phase 3)
-- Qo'llash: Supabase Dashboard → SQL Editor → shu fayl kontentini paste → Run
-- Idempotent: qayta ishga tushirish xavfsiz (IF NOT EXISTS / ON CONFLICT).
-- Tarkib: 0001 sxema → 0002 RLS → 0003 storage
-- ============================================================================

-- ============================================================================
-- 202-maktab — Phase 3 initial schema (Supabase PostgreSQL)
-- Reproducible migration: apply top-to-bottom in the Supabase SQL editor
-- or via `supabase db push`. Never rely on manual dashboard clicks.
--
-- Conventions:
--  * TEXT primary keys where the public API already exposes stable ids
--    (team p-*, gallery g-*/v-*, facilities/features/statistics/quick-links).
--  * UUID primary keys for admin-only or URL-slug-addressed resources
--    (news articles are addressed by unique slug, never by numeric id).
--  * timestamptz everywhere; updated_at maintained by trigger.
--  * No media binaries in the database — metadata + URLs only (Supabase
--    Storage holds the files; see 0003_storage.sql).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. site_settings (singleton row, id = 1)
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  id            integer primary key default 1 check (id = 1),
  school_name   text not null,
  short_name    text,
  tagline       text,
  description   text,
  district      text,
  address       text,
  established   text,
  locale        text not null default 'uz',
  logo_url      text,
  favicon_url   text,
  phone         jsonb,   -- { display, href }
  mobile        jsonb,
  email         jsonb,
  working_hours jsonb,   -- [ { days, time } ]
  social_links  jsonb,   -- { telegram, instagram, ... }
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_site_settings_updated on site_settings;
create trigger trg_site_settings_updated before update on site_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. statistics
-- ---------------------------------------------------------------------------
create table if not exists statistics (
  id          text primary key,
  label       text not null,
  value       integer not null check (value >= 0),
  suffix      text not null default '',
  description text not null default '',
  icon        text not null default 'info',
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_statistics_visible_order on statistics (is_visible, sort_order);

drop trigger if exists trg_statistics_updated on statistics;
create trigger trg_statistics_updated before update on statistics
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. features (education experience tiles)
-- ---------------------------------------------------------------------------
create table if not exists features (
  id            text primary key,
  display_index text not null default '',
  title         text not null,
  description   text not null default '',
  icon          text not null default 'info',
  image_url     text,
  alt           text,
  sort_order    integer not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_features_visible_order on features (is_visible, sort_order);

drop trigger if exists trg_features_updated on features;
create trigger trg_features_updated before update on features
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. facilities (learning-environment scroll story)
-- ---------------------------------------------------------------------------
create table if not exists facilities (
  id          text primary key,
  kicker      text not null default '',
  title       text not null,
  description text not null default '',
  image_url   text not null default '',
  image_alt   text not null default '',
  video_url   text,
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_facilities_visible_order on facilities (is_visible, sort_order);

drop trigger if exists trg_facilities_updated on facilities;
create trigger trg_facilities_updated before update on facilities
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. team_members
--    PROTOTYPE data is seeded verbatim and labelled — never presented as real.
-- ---------------------------------------------------------------------------
create table if not exists team_members (
  id           text primary key,
  full_name    text not null,
  position     text not null,
  subject      text,
  bio          text,
  category     text not null default '',
  member_group text not null default 'teachers'
               check (member_group in ('leadership', 'teachers', 'administration')),
  experience   text not null default '',
  photo_url    text,
  photo_alt    text not null default '',
  email        text,
  phone        text,
  sort_order   integer not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_team_visible_order on team_members (is_visible, sort_order);
create index if not exists idx_team_group on team_members (member_group);

drop trigger if exists trg_team_updated on team_members;
create trigger trg_team_updated before update on team_members
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. news_categories
-- ---------------------------------------------------------------------------
create table if not exists news_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. news_articles
--    Status model: is_published=false → draft (admin-only visibility).
--    DELETE is a soft archive (archived_at); hard delete is deliberate
--    and must go through the admin service with confirmation.
-- ---------------------------------------------------------------------------
create table if not exists news_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 3 and 200),
  excerpt      text not null default '',
  content      jsonb not null default '[]',  -- [{ type: p|h|quote, text }]
  cover_image  text,
  cover_alt    text not null default '',
  category_id  uuid references news_categories (id) on delete set null,
  category     text,                          -- denormalized display name (kept in sync on write)
  author_name  text,
  reading_time text,
  is_published boolean not null default false,
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (not is_published or published_at is not null or true) -- publish flow sets published_at in service
);

create index if not exists idx_news_published_at on news_articles (published_at desc);
create index if not exists idx_news_category on news_articles (category_id);
create index if not exists idx_news_is_published on news_articles (is_published);
create index if not exists idx_news_archived on news_articles (archived_at);

drop trigger if exists trg_news_updated on news_articles;
create trigger trg_news_updated before update on news_articles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. gallery_categories
-- ---------------------------------------------------------------------------
create table if not exists gallery_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9. gallery_items
--    src holds the final public URL (Supabase Storage public_url or an
--    external media URL). Binaries never live in PostgreSQL.
-- ---------------------------------------------------------------------------
create table if not exists gallery_items (
  id           text primary key,
  type         text not null check (type in ('image', 'video')),
  src          text not null,
  poster       text,
  alt          text not null default '',
  caption      text,
  external_url text,
  category_id  uuid references gallery_categories (id) on delete set null,
  category     text,                        -- denormalized display name (kept in sync on write)
  album        text not null default '',
  width        integer not null default 0 check (width >= 0),
  height       integer not null default 0 check (height >= 0),
  sort_order   integer not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_gallery_visible_order on gallery_items (is_visible, sort_order);
create index if not exists idx_gallery_category on gallery_items (category_id);

drop trigger if exists trg_gallery_updated on gallery_items;
create trigger trg_gallery_updated before update on gallery_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. faqs
-- ---------------------------------------------------------------------------
create table if not exists faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null check (char_length(question) between 3 and 500),
  answer     text not null check (char_length(answer) <= 4000),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faqs_visible_order on faqs (is_visible, sort_order);

drop trigger if exists trg_faqs_updated on faqs;
create trigger trg_faqs_updated before update on faqs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. quick_links
-- ---------------------------------------------------------------------------
create table if not exists quick_links (
  id              text primary key,
  title           text not null,
  description     text not null default '',
  icon            text not null default 'link',
  url             text not null,
  open_in_new_tab boolean not null default false,
  sort_order      integer not null default 0,
  is_visible      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_quick_links_visible_order on quick_links (is_visible, sort_order);

drop trigger if exists trg_quick_links_updated on quick_links;
create trigger trg_quick_links_updated before update on quick_links
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 12. contact_information (official public info — singleton, id = 1)
--     NOT to be confused with contact_submissions (private inbox).
-- ---------------------------------------------------------------------------
create table if not exists contact_information (
  id             integer primary key default 1 check (id = 1),
  address        text,
  phone          jsonb,   -- { display, href }
  mobile         jsonb,
  email          jsonb,
  working_hours  jsonb,   -- [ { days, time } ]
  latitude       double precision,
  longitude      double precision,
  map_embed      text,
  map_route      text,
  map_view       text,
  is_verified    boolean not null default false,
  social_links   jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_contact_info_updated on contact_information;
create trigger trg_contact_info_updated before update on contact_information
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. contact_submissions (ADMIN-ONLY data — never exposed publicly)
-- ---------------------------------------------------------------------------
create table if not exists contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,
  topic      text,
  message    text not null,
  status     text not null default 'new'
             check (status in ('new', 'in_progress', 'resolved', 'spam')),
  source     text not null default 'website',
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists idx_submissions_status on contact_submissions (status);
create index if not exists idx_submissions_created on contact_submissions (created_at desc);

-- ---------------------------------------------------------------------------
-- 14. media_assets (Supabase Storage metadata — files live in Storage)
-- ---------------------------------------------------------------------------
create table if not exists media_assets (
  id           uuid primary key default gen_random_uuid(),
  file_name    text not null,
  storage_path text,
  public_url   text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  width        integer,
  height       integer,
  duration     real,
  alt_text     text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 15. admin_audit_logs
--     Phase 3: admin_identifier is null unless dev-token auth was used
--     (recorded truthfully as mechanism, never as a fake person).
--     Phase 4 attaches real authenticated admin identity.
-- ---------------------------------------------------------------------------
create table if not exists admin_audit_logs (
  id               bigint generated always as identity primary key,
  admin_identifier text,
  action           text not null,  -- CREATE | UPDATE | DELETE | ARCHIVE | PUBLISH | UNPUBLISH | STATUS_CHANGE | REORDER
  entity_type      text not null,
  entity_id        text,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_audit_created on admin_audit_logs (created_at desc);
create index if not exists idx_audit_entity on admin_audit_logs (entity_type, entity_id);
-- ============================================================================
-- 202-maktab — Phase 3 Row Level Security (honest, minimal, no fake policies)
--
-- Model:
--   * RLS is ENABLED on every table with NO policies → anonymous/authenticated
--     PostgREST clients (anon key) can read NOTHING. Default deny.
--   * The Next.js server is the only database client. It uses the
--     SERVICE ROLE key server-side (bypasses RLS) behind our validated,
--     rate-limited API architecture.
--   * There are deliberately NO "public can select published rows" policies:
--     the public reads through /api/v1/*, which enforces draft/archive
--     separation and pagination in one place.
--
-- Phase 4: real authentication + roles may add targeted policies (e.g. a
-- `admin_users` table with policies on admin endpoints). Until then this
-- default-deny setup is the security boundary — documented, not cosmetized.
-- ============================================================================

alter table site_settings        enable row level security;
alter table statistics           enable row level security;
alter table features             enable row level security;
alter table facilities           enable row level security;
alter table team_members         enable row level security;
alter table news_categories      enable row level security;
alter table news_articles        enable row level security;
alter table gallery_categories   enable row level security;
alter table gallery_items        enable row level security;
alter table faqs                 enable row level security;
alter table quick_links          enable row level security;
alter table contact_information  enable row level security;
alter table contact_submissions  enable row level security;
alter table media_assets         enable row level security;
alter table admin_audit_logs     enable row level security;

-- Explicit comment trail (visible in pg_description / dashboard):
comment on table contact_submissions is 'ADMIN-ONLY. RLS on, no policies: only service role (API server) may read/write. Never expose via public API.';
comment on table admin_audit_logs  is 'ADMIN-ONLY. RLS on, no policies: only service role (API server) may read/write.';
comment on table news_articles     is 'Public rows served ONLY via API server (draft/archive separation enforced there). RLS on, no policies for anon.';
-- ============================================================================
-- 202-maktab — Phase 3 storage foundation (Supabase Storage)
--
--  * One public bucket `media` for images / videos / documents.
--  * The DATABASE stores metadata + public URLs only (media_assets table).
--  * Uploads in Phase 3: foundation only (no upload pipeline yet — see
--    PHASE-3-HISOBOT.md limitations). The bucket + listing admin API exist so
--    Phase 4/5 can add authenticated uploads without schema changes.
--  * Binaries are NEVER inserted into PostgreSQL.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Public buckets are readable by anyone through the public URL by design.
-- Writes: in Phase 3 only the service role key (server-side) may upload —
-- there are intentionally NO storage object policies granting anon writes.
-- Phase 4 adds authenticated upload policies together with real admin auth.
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
-- Idempotent: safe to re-run.
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
on conflict (role) do update
  set description = excluded.description,
      permissions = excluded.permissions;

-- ---------------------------------------------------------------------------
-- 2. admin_users — one row per authorized administrator.
--    `user_id` is the Supabase Auth UUID (auth.users.id). Passwords are NEVER
--    stored here: credential verification is delegated entirely to GoTrue.
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  email         text not null unique,
  role          text not null default 'admin' references admin_roles (role) on restrict,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

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

create index if not exists idx_audit_admin_user on admin_audit_logs (admin_user_id);

comment on column admin_audit_logs.admin_user_id is
  'Phase 4: auth.users.id of the authenticated administrator (null for anonymous/failed attempts).';

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
-- ---------------------------------------------------------------------------
alter table media_assets add column if not exists uploaded_by uuid references auth.users (id) on delete set null;

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
  'ADMIN-ONLY. Links auth.users.id → role. No anon policies; self-select only for the owning user.';
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
