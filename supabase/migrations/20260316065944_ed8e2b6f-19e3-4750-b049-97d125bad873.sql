CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'reference-library');
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'reference-library');
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO public USING (bucket_id = 'reference-library');