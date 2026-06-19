-- Message attachments bucket and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message attachments to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update message attachments in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete message attachments in own folder" ON storage.objects;

CREATE POLICY "Authenticated users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can upload message attachments to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update message attachments in own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete message attachments in own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
