ALTER TABLE public.inventaris
  ADD COLUMN IF NOT EXISTS jumlah_tersedia integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Tersedia';

UPDATE public.inventaris SET jumlah_tersedia = jumlah;

CREATE OR REPLACE FUNCTION public.recalc_inventaris_stok(_inventaris_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_jumlah int; v_pinjam int; v_kondisi text;
BEGIN
  SELECT jumlah, kondisi INTO v_jumlah, v_kondisi FROM public.inventaris WHERE id = _inventaris_id;
  IF v_jumlah IS NULL THEN RETURN; END IF;
  SELECT COALESCE(sum(jumlah),0) INTO v_pinjam FROM public.peminjaman_inventaris
    WHERE inventaris_id = _inventaris_id AND status = 'Dipinjam';
  UPDATE public.inventaris SET
    jumlah_tersedia = GREATEST(v_jumlah - v_pinjam, 0),
    status = CASE
      WHEN v_kondisi = 'Hilang' THEN 'Hilang'
      WHEN v_kondisi = 'Rusak' THEN 'Rusak'
      WHEN v_jumlah - v_pinjam <= 0 THEN 'Habis Dipinjam'
      WHEN v_pinjam > 0 THEN 'Dipinjam Sebagian'
      ELSE 'Tersedia' END
  WHERE id = _inventaris_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_peminjaman_stok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.inventaris_id IS DISTINCT FROM COALESCE(NEW.inventaris_id, OLD.inventaris_id) THEN
    PERFORM public.recalc_inventaris_stok(OLD.inventaris_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_inventaris_stok(OLD.inventaris_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_inventaris_stok(NEW.inventaris_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS peminjaman_stok ON public.peminjaman_inventaris;
CREATE TRIGGER peminjaman_stok
AFTER INSERT OR UPDATE OR DELETE ON public.peminjaman_inventaris
FOR EACH ROW EXECUTE FUNCTION public.trg_peminjaman_stok();

CREATE OR REPLACE FUNCTION public.trg_inventaris_stok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.jumlah IS DISTINCT FROM OLD.jumlah OR NEW.kondisi IS DISTINCT FROM OLD.kondisi THEN
    PERFORM public.recalc_inventaris_stok(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS inventaris_stok ON public.inventaris;
CREATE TRIGGER inventaris_stok
AFTER INSERT OR UPDATE OF jumlah, kondisi ON public.inventaris
FOR EACH ROW EXECUTE FUNCTION public.trg_inventaris_stok();