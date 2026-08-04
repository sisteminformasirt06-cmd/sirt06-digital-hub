CREATE POLICY "inventaris_foto_all" ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id = 'inventaris-foto') WITH CHECK (bucket_id = 'inventaris-foto');