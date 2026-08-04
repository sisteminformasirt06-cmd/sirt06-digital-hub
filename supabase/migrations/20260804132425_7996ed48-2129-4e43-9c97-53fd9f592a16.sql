CREATE TABLE public.inventaris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  kategori text NOT NULL DEFAULT 'Inventaris Lainnya',
  merk text,
  jumlah integer NOT NULL DEFAULT 1,
  satuan text NOT NULL DEFAULT 'Unit',
  kondisi text NOT NULL DEFAULT 'Baik',
  lokasi text,
  tanggal_pembelian date,
  sumber_dana text,
  nilai numeric NOT NULL DEFAULT 0,
  foto_url text,
  keterangan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventaris TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventaris TO anon;
GRANT ALL ON public.inventaris TO service_role;
ALTER TABLE public.inventaris ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventaris_all_access ON public.inventaris FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_inventaris_updated BEFORE UPDATE ON public.inventaris FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.peminjaman_inventaris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaris_id uuid NOT NULL REFERENCES public.inventaris(id) ON DELETE CASCADE,
  peminjam text NOT NULL,
  jumlah integer NOT NULL DEFAULT 1,
  tanggal_pinjam date NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kembali date,
  status text NOT NULL DEFAULT 'Dipinjam',
  catatan text,
  petugas_nama text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peminjaman_inventaris TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peminjaman_inventaris TO anon;
GRANT ALL ON public.peminjaman_inventaris TO service_role;
ALTER TABLE public.peminjaman_inventaris ENABLE ROW LEVEL SECURITY;
CREATE POLICY peminjaman_all_access ON public.peminjaman_inventaris FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_peminjaman_updated BEFORE UPDATE ON public.peminjaman_inventaris FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.next_inventaris_kode(_kategori text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text := upper(regexp_replace(coalesce(_kategori,'LAIN'), '[^a-zA-Z]', '', 'g'));
  v_year text := to_char(now(), 'YYYY');
  v_count int;
BEGIN
  v_prefix := left(coalesce(nullif(v_prefix,''),'LAIN'), 3);
  SELECT count(*) + 1 INTO v_count FROM public.inventaris
    WHERE kode LIKE 'INV-' || v_prefix || '-' || v_year || '-%';
  RETURN 'INV-' || v_prefix || '-' || v_year || '-' || lpad(v_count::text, 3, '0');
END $$;