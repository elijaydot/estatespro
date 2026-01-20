-- Make the maintenance-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'maintenance-photos';

-- Drop existing public policy
DROP POLICY IF EXISTS "Anyone can view maintenance photos" ON storage.objects;

-- Property managers can view all maintenance photos they own
CREATE POLICY "Property managers can view maintenance photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'maintenance-photos' AND
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.user_id = auth.uid()
    AND mr.image_url LIKE '%' || name || '%'
  )
);

-- Tenants can view photos for their own maintenance requests
CREATE POLICY "Tenants can view their maintenance request photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'maintenance-photos' AND
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    JOIN tenants t ON t.id = mr.tenant_id
    WHERE t.tenant_user_id = auth.uid()
    AND mr.image_url LIKE '%' || name || '%'
  )
);