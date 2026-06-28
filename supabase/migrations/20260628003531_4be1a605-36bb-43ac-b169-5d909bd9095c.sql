
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.surat_status AS ENUM ('Menunggu','Diproses','Disetujui','Ditolak');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.surat_pengajuan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_surat text NOT NULL UNIQUE,
  jenis text NOT NULL,
  pemohon_nama text NOT NULL,
  pemohon_nik text,
  pemohon_alamat text,
  pemohon_telp text,
  keperluan text NOT NULL,
  catatan text,
  status public.surat_status NOT NULL DEFAULT 'Menunggu',
  alasan_tolak text,
  approved_by uuid REFERENCES public.pengurus(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_nama text,
  approved_jabatan text,
  created_by uuid REFERENCES public.pengurus(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surat_status ON public.surat_pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_surat_created_at ON public.surat_pengajuan(created_at DESC);

GRANT ALL ON public.surat_pengajuan TO service_role;
ALTER TABLE public.surat_pengajuan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny direct surat" ON public.surat_pengajuan FOR ALL TO public USING (false) WITH CHECK (false);

-- Auto numbering: SR-RT06/{JENIS_KODE}/{YYYY}/{seq 4 digit}
CREATE OR REPLACE FUNCTION public.next_surat_nomor(_jenis_kode text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_count int;
  v_seq text;
BEGIN
  SELECT count(*) + 1 INTO v_count
    FROM public.surat_pengajuan
    WHERE to_char(created_at, 'YYYY') = v_year
      AND nomor_surat LIKE '%/' || _jenis_kode || '/' || v_year || '/%';
  v_seq := lpad(v_count::text, 4, '0');
  RETURN 'SR-RT06/' || _jenis_kode || '/' || v_year || '/' || v_seq;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_surat_updated ON public.surat_pengajuan;
CREATE TRIGGER trg_surat_updated BEFORE UPDATE ON public.surat_pengajuan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
