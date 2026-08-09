REVOKE EXECUTE ON FUNCTION public.recalc_inventaris_stok(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_inventaris_stok() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_peminjaman_stok() FROM PUBLIC, anon, authenticated;