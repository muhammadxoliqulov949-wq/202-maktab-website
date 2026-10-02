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
