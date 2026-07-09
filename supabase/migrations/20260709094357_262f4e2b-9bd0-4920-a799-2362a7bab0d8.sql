
CREATE POLICY "keuangan lampiran read" ON storage.objects FOR SELECT USING (bucket_id = 'keuangan-lampiran');
CREATE POLICY "keuangan lampiran write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'keuangan-lampiran');
CREATE POLICY "keuangan lampiran update" ON storage.objects FOR UPDATE USING (bucket_id = 'keuangan-lampiran');
CREATE POLICY "keuangan lampiran delete" ON storage.objects FOR DELETE USING (bucket_id = 'keuangan-lampiran');
