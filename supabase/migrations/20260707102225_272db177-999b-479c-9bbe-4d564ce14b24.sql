
CREATE POLICY "warga_photos_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'warga-photos');
CREATE POLICY "warga_photos_insert" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'warga-photos');
CREATE POLICY "warga_photos_update" ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'warga-photos') WITH CHECK (bucket_id = 'warga-photos');
CREATE POLICY "warga_photos_delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'warga-photos');
