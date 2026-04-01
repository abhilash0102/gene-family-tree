-- Fix node_positions: add unique constraint for upsert to work
ALTER TABLE public.node_positions 
ADD CONSTRAINT node_positions_admin_person_unique UNIQUE (admin_id, person_id);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow public read access to photos
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'photos');

-- Allow authenticated users to update photos
CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos');