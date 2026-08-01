CREATE TABLE public.agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  tanggal date NOT NULL,
  jam text NOT NULL DEFAULT '00:00',
  tempat text NOT NULL DEFAULT '',
  deskripsi text,
  status text NOT NULL DEFAULT 'Akan Datang',
  disetujui boolean NOT NULL DEFAULT false,
  arsip boolean NOT NULL DEFAULT false,
  dibuat_oleh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda TO anon, authenticated;
GRANT ALL ON public.agenda TO service_role;

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_all_access ON public.agenda FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER agenda_set_updated_at BEFORE UPDATE ON public.agenda
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();