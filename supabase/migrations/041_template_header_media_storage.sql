-- ============================================================
-- 041_template_header_media_storage.sql
--
-- Adds message_templates.header_media_url and the `template-media`
-- Storage bucket so a template's header image/video/document only
-- has to be uploaded ONCE (in Settings -> Message Templates),
-- instead of every broadcast operator pasting a URL by hand in the
-- campaign wizard. Meta requires the media reference on every send
-- of a media-header template (not just at approval) -- see
-- src/lib/whatsapp/meta-api.ts sendTemplateMessage.
--
-- File path convention used by the app:
--   template-media/{user_id}/{template_id}/header-<timestamp>.<ext>
--
-- Idempotent -- safe to re-run.
-- ============================================================

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS header_media_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-media',
  'template-media',
  TRUE,
  16777216, -- 16 MB, comfortably covers Meta's image/video/doc header limits
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/3gpp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Template media is publicly readable" ON storage.objects;
CREATE POLICY "Template media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-media');

DROP POLICY IF EXISTS "Authenticated users can upload template media" ON storage.objects;
CREATE POLICY "Authenticated users can upload template media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'template-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update template media" ON storage.objects;
CREATE POLICY "Authenticated users can update template media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'template-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete template media" ON storage.objects;
CREATE POLICY "Authenticated users can delete template media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'template-media' AND auth.role() = 'authenticated');
