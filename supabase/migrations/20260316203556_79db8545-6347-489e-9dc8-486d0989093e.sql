CREATE POLICY "Public update prompts storage"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'prompts')
WITH CHECK (bucket_id = 'prompts');