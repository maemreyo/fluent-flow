-- 1. Create a public bucket for user avatars if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable public read access to the bucket.
-- This allows anyone to view the avatars via the public URL.
CREATE POLICY "Public read access for user-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- 3. Allow any authenticated user to upload files to this bucket.
-- The frontend logic which names files with `user.id` and a timestamp
-- provides a basic level of security against overwriting other users' files.
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');
