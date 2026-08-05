CREATE TABLE public.poskamling_petugas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  anggota_id uuid REFERENCES public.anggota_keluarga(id) ON DELETE SET NULL,
  regu text NOT NULL DEFAULT 'Regu 1',
  no_hp text,
  aktif boolean NOT NULL DEFAULT true,
  keterangan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_petugas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_petugas TO anon;
GRANT ALL ON public.poskamling_petugas TO service_role;
ALTER TABLE public.poskamling_petugas ENABLE ROW LEVEL SECURITY;
CREATE POLICY poskamling_petugas_all ON public.poskamling_petugas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pos_petugas_updated BEFORE UPDATE ON public.poskamling_petugas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.poskamling_jadwal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  hari text NOT NULL DEFAULT '',
  jam_mulai text NOT NULL DEFAULT '20:00',
  jam_selesai text NOT NULL DEFAULT '00:00',
  regu text NOT NULL DEFAULT 'Regu 1',
  petugas_1 text NOT NULL,
  petugas_2 text,
  petugas_cadangan text,
  catatan text,
  dibuat_oleh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_jadwal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_jadwal TO anon;
GRANT ALL ON public.poskamling_jadwal TO service_role;
ALTER TABLE public.poskamling_jadwal ENABLE ROW LEVEL SECURITY;
CREATE POLICY poskamling_jadwal_all ON public.poskamling_jadwal FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pos_jadwal_updated BEFORE UPDATE ON public.poskamling_jadwal FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.poskamling_absensi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jadwal_id uuid REFERENCES public.poskamling_jadwal(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  petugas_nama text NOT NULL,
  status text NOT NULL DEFAULT 'Hadir',
  jam_masuk text,
  jam_pulang text,
  lokasi text,
  foto_url text,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_absensi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_absensi TO anon;
GRANT ALL ON public.poskamling_absensi TO service_role;
ALTER TABLE public.poskamling_absensi ENABLE ROW LEVEL SECURITY;
CREATE POLICY poskamling_absensi_all ON public.poskamling_absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pos_absensi_updated BEFORE UPDATE ON public.poskamling_absensi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.poskamling_laporan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  deskripsi text NOT NULL DEFAULT '',
  foto_url text,
  lokasi text,
  tingkat text NOT NULL DEFAULT 'Ringan',
  status text NOT NULL DEFAULT 'Baru',
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  pelapor_nama text,
  tindak_lanjut text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_laporan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_laporan TO anon;
GRANT ALL ON public.poskamling_laporan TO service_role;
ALTER TABLE public.poskamling_laporan ENABLE ROW LEVEL SECURITY;
CREATE POLICY poskamling_laporan_all ON public.poskamling_laporan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pos_laporan_updated BEFORE UPDATE ON public.poskamling_laporan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.poskamling_inventaris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaris_id uuid NOT NULL REFERENCES public.inventaris(id) ON DELETE CASCADE,
  jumlah integer NOT NULL DEFAULT 1,
  catatan text,
  ditambah_oleh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventaris_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_inventaris TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poskamling_inventaris TO anon;
GRANT ALL ON public.poskamling_inventaris TO service_role;
ALTER TABLE public.poskamling_inventaris ENABLE ROW LEVEL SECURITY;
CREATE POLICY poskamling_inventaris_all ON public.poskamling_inventaris FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pos_inv_updated BEFORE UPDATE ON public.poskamling_inventaris FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();