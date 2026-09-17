-- ============================================================
-- 040_contact_avatars_storage.sql
--
-- Creates the `contact-avatars` Supabase Storage bucket and RLS
-- policies for customer profile photos shown in the inbox contact
-- sidebar. WhatsApp's Cloud API never exposes a customer's own
-- profile photo (withheld for privacy), so this is a manual upload
-- by whichever team member is handling the conversation — unlike
-- `avatars` (008_profile_avatars_storage.sql), which is scoped to
-- auth.uid() because a user uploads their own, writes here are
-- allowed for any authenticated user rather than folder-owner-only.
--
-- File path convention used by the app:
--   contact-avatars/{contact_id}/avatar-<timestamp>.<ext>
--
-- Idempotent — safe to re-run.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-avatars',
  'contact-avatars',
  TRUE,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies live on storage.objects. Drop-if-exists because Postgres
-- has no CREATE POLICY IF NOT EXISTS, and we want this migration to
-- re-run cleanly.
DROP POLICY IF EXISTS "Contact avatars are publicly readable" ON storage.objects;
CREATE POLICY "Contact avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-avatars');

DROP POLICY IF EXISTS "Authenticated users can upload contact avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload contact avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contact-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update contact avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update contact avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contact-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete contact avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete contact avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact-avatars' AND auth.role() = 'authenticated');
