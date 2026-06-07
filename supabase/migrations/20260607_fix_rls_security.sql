-- Security: fix RLS holes identified in audit
-- Applied 2026-06-07 via Supabase MCP (fix_rls_security_holes migration)

-- ── Fix 1: web_interest missing WITH CHECK ───────────────────────────────
-- Without WITH CHECK, any authenticated user could INSERT/UPDATE a row with
-- any user_id (including another user's). Added explicit write guard.
DROP POLICY IF EXISTS "users_manage_own_web_interest" ON public.web_interest;

CREATE POLICY "users_manage_own_web_interest"
  ON public.web_interest
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Fix 2: admin_audit_log INSERT allowed anyone to write fake entries ────
-- Previous policy had WITH CHECK = true (no restriction). Replaced with:
-- caller must be the admin logging the action AND must be an admin role.
DROP POLICY IF EXISTS "service_insert_audit_log" ON public.admin_audit_log;

CREATE POLICY "admins_insert_audit_log"
  ON public.admin_audit_log
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = admin_id
    AND is_admin()
  );

-- ── Fix 3: profiles WITH CHECK re-asserted explicitly ─────────────────────
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;

CREATE POLICY "Users manage own profile"
  ON public.profiles
  FOR ALL
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
