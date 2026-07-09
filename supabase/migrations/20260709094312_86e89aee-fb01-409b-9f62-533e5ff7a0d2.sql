
CREATE TABLE public.transaksi_kas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kas TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('Masuk','Keluar')),
  jumlah NUMERIC(15,2) NOT NULL CHECK (jumlah >= 0),
  keterangan TEXT NOT NULL,
  tanggal DATE NOT NULL,
  lampiran_url TEXT,
  petugas_nama TEXT NOT NULL,
  petugas_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaksi_kas TO anon, authenticated;
GRANT ALL ON public.transaksi_kas TO service_role;
ALTER TABLE public.transaksi_kas ENABLE ROW LEVEL SECURITY;
CREATE POLICY trx_all_access ON public.transaksi_kas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.transaksi_kas_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaksi_id UUID NOT NULL REFERENCES public.transaksi_kas(id) ON DELETE CASCADE,
  aksi TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  diubah_oleh_nama TEXT NOT NULL,
  diubah_oleh_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transaksi_kas_history TO anon, authenticated;
GRANT ALL ON public.transaksi_kas_history TO service_role;
ALTER TABLE public.transaksi_kas_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY trx_hist_all_access ON public.transaksi_kas_history FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_trx_kas ON public.transaksi_kas(kas);
CREATE INDEX idx_trx_tanggal ON public.transaksi_kas(tanggal DESC);
CREATE INDEX idx_trx_hist_trx ON public.transaksi_kas_history(transaksi_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_trx()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_trx_updated BEFORE UPDATE ON public.transaksi_kas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_trx();
