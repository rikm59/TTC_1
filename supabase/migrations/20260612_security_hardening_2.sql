-- Trigger functions must not be callable via RPC:
-- revoke from PUBLIC (which is what Supabase grants by default)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_trial_expiry() FROM PUBLIC;

-- is_admin: switch from SECURITY DEFINER to SECURITY INVOKER.
-- It only reads auth.uid()'s own profile row, so no elevated privilege
-- is required. This removes the SECURITY DEFINER advisory entirely.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM profiles WHERE id = auth.uid()), false)
$$;
