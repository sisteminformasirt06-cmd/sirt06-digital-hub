
-- Extension untuk hash PIN
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum role
CREATE TYPE public.app_role AS ENUM (
  'super_admin','ketua_rt','sekretaris','bendahara_1','bendahara_2',
  'humas','keamanan_1','keamanan_2','sie_perlengkapan','sie_kematian',
  'sie_umum','warga'
);

-- Tabel pengurus (akun login)
CREATE TABLE public.pengurus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  jabatan app_role NOT NULL,
  pin_hash TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  harus_ganti_pin BOOLEAN NOT NULL DEFAULT true,
  gagal_login INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.pengurus(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengurus TO authenticated;
GRANT ALL ON public.pengurus TO service_role;
ALTER TABLE public.pengurus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny direct pengurus" ON public.pengurus FOR ALL USING (false) WITH CHECK (false);

-- Tabel role (terpisah)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengurus_id UUID NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(pengurus_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny direct roles" ON public.user_roles FOR ALL USING (false) WITH CHECK (false);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengurus_id UUID REFERENCES public.pengurus(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  role app_role,
  aksi TEXT NOT NULL,
  modul TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  waktu TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny direct audit" ON public.audit_log FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX audit_waktu_idx ON public.audit_log(waktu DESC);

-- Session pengurus (cookie-based)
CREATE TABLE public.pengurus_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengurus_id UUID NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengurus_session TO authenticated;
GRANT ALL ON public.pengurus_session TO service_role;
ALTER TABLE public.pengurus_session ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny direct session" ON public.pengurus_session FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX session_token_idx ON public.pengurus_session(token_hash);

-- Helper: cek role (SECURITY DEFINER, anti-rekursi)
CREATE OR REPLACE FUNCTION public.has_role(_pengurus_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE pengurus_id = _pengurus_id AND role = _role
  );
$$;

-- Seed Super Admin pertama (PIN: 000000, wajib ganti)
DO $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pengurus WHERE jabatan = 'super_admin') THEN
    INSERT INTO public.pengurus (nama, jabatan, pin_hash, aktif, harus_ganti_pin)
    VALUES ('Super Admin', 'super_admin', crypt('000000', gen_salt('bf')), true, true)
    RETURNING id INTO v_id;
    INSERT INTO public.user_roles (pengurus_id, role) VALUES (v_id, 'super_admin');
  END IF;
END $$;
