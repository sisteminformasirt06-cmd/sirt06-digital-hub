
CREATE OR REPLACE FUNCTION public.pengurus_attempt_login(_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_user public.pengurus;
BEGIN
  SELECT * INTO v_user FROM public.pengurus
    WHERE pin_hash = crypt(_pin, pin_hash) AND aktif = true LIMIT 1;
  IF v_user.id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'locked', true, 'until', v_user.locked_until);
  END IF;
  UPDATE public.pengurus SET gagal_login=0, locked_until=NULL, last_login_at=now() WHERE id=v_user.id;
  RETURN jsonb_build_object('ok', true, 'id', v_user.id, 'nama', v_user.nama,
    'jabatan', v_user.jabatan, 'harus_ganti_pin', v_user.harus_ganti_pin);
END$$;

CREATE OR REPLACE FUNCTION public.pengurus_change_pin(_id UUID, _old TEXT, _new TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_match BOOLEAN;
BEGIN
  SELECT (pin_hash = crypt(_old, pin_hash)) INTO v_match FROM public.pengurus WHERE id=_id;
  IF NOT COALESCE(v_match,false) THEN RETURN false; END IF;
  UPDATE public.pengurus SET pin_hash=crypt(_new, gen_salt('bf')), harus_ganti_pin=false WHERE id=_id;
  RETURN true;
END$$;

CREATE OR REPLACE FUNCTION public.pengurus_reset_pin(_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
  UPDATE public.pengurus SET pin_hash=crypt('123456', gen_salt('bf')),
    harus_ganti_pin=true, gagal_login=0, locked_until=NULL WHERE id=_id;
$$;

CREATE OR REPLACE FUNCTION public.pengurus_set_pin(_id UUID, _pin TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
  UPDATE public.pengurus SET pin_hash=crypt(_pin, gen_salt('bf')), harus_ganti_pin=true WHERE id=_id;
$$;

REVOKE EXECUTE ON FUNCTION public.pengurus_attempt_login(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pengurus_change_pin(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pengurus_reset_pin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pengurus_set_pin(UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pengurus_attempt_login(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pengurus_change_pin(UUID,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pengurus_reset_pin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.pengurus_set_pin(UUID,TEXT) TO service_role;
