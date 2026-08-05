CREATE POLICY "poskamling_foto_all" ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id = 'poskamling-foto') WITH CHECK (bucket_id = 'poskamling-foto');