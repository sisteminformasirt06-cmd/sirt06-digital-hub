
ALTER TABLE public.surat_pengajuan ADD COLUMN IF NOT EXISTS nomor_kk text;

ALTER TYPE public.surat_status ADD VALUE IF NOT EXISTS 'Draft' BEFORE 'Menunggu';
ALTER TYPE public.surat_status ADD VALUE IF NOT EXISTS 'Selesai';

-- Permissive access to align with app's local-PIN auth model (mirrors kartu_keluarga)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surat_pengajuan TO anon, authenticated;
GRANT ALL ON public.surat_pengajuan TO service_role;

DROP POLICY IF EXISTS "deny direct surat" ON public.surat_pengajuan;
DROP POLICY IF EXISTS surat_all_access ON public.surat_pengajuan;
CREATE POLICY surat_all_access ON public.surat_pengajuan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
