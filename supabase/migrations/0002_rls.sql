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
