
-- Data Warga module: KK and Anggota Keluarga tables + photo storage

CREATE TABLE public.kartu_keluarga (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_kk TEXT NOT NULL UNIQUE,
  kepala_keluarga TEXT NOT NULL,
  alamat TEXT NOT NULL,
  no_wa TEXT,
  rt TEXT,
  rw TEXT,
  status_kk TEXT NOT NULL DEFAULT 'Aktif' CHECK (status_kk IN ('Aktif','Pindah')),
  foto_kk_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kartu_keluarga TO anon, authenticated;
GRANT ALL ON public.kartu_keluarga TO service_role;
ALTER TABLE public.kartu_keluarga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kk_all_access" ON public.kartu_keluarga FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.anggota_keluarga (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kk_id UUID NOT NULL REFERENCES public.kartu_keluarga(id) ON DELETE CASCADE,
  nik TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),
  tempat_lahir TEXT,
  tanggal_lahir DATE,
  agama TEXT,
  pendidikan TEXT,
  pekerjaan TEXT,
  status_keluarga TEXT,
  status_perkawinan TEXT,
  status_warga TEXT NOT NULL DEFAULT 'Warga Tetap' CHECK (status_warga IN ('Warga Tetap','Warga Domisili','Warga Kontrak/Sewa')),
  no_hp TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anggota_keluarga TO anon, authenticated;
GRANT ALL ON public.anggota_keluarga TO service_role;
ALTER TABLE public.anggota_keluarga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anggota_all_access" ON public.anggota_keluarga FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_anggota_kk ON public.anggota_keluarga(kk_id);
CREATE INDEX idx_anggota_nama ON public.anggota_keluarga(nama);

-- Enforce max 8 anggota per KK
CREATE OR REPLACE FUNCTION public.check_max_anggota()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.anggota_keluarga WHERE kk_id = NEW.kk_id) >= 8 THEN
    RAISE EXCEPTION 'Maksimal 8 anggota per KK';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_max_anggota BEFORE INSERT ON public.anggota_keluarga
  FOR EACH ROW EXECUTE FUNCTION public.check_max_anggota();

CREATE TRIGGER trg_kk_updated BEFORE UPDATE ON public.kartu_keluarga
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_anggota_updated BEFORE UPDATE ON public.anggota_keluarga
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
