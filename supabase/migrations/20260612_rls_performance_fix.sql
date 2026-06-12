-- Fixes two classes of RLS performance advisories:
--   1. auth_rls_initplan  — wrap auth.uid() / is_admin() in (SELECT ...) so
--      Postgres evaluates them once per query, not once per row.
--   2. multiple_permissive_policies — merge per-table "user ALL + admin SELECT"
--      into per-command policies with a single SELECT each.
-- Also adds missing FK index on web_interest.user_id.

-- ── admin_audit_log ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_insert_audit_log"  ON public.admin_audit_log;
DROP POLICY IF EXISTS "admins_read_audit_log"    ON public.admin_audit_log;

CREATE POLICY "admins_insert_audit_log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = admin_id AND (SELECT is_admin())
  );
CREATE POLICY "admins_read_audit_log" ON public.admin_audit_log
  FOR SELECT USING ((SELECT is_admin()));

-- ── change_orders ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own change orders" ON public.change_orders;
CREATE POLICY "users_manage_own_change_orders" ON public.change_orders
  FOR ALL
  USING    ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── client_notes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own notes" ON public.client_notes;
CREATE POLICY "users_manage_own_notes" ON public.client_notes
  FOR ALL
  USING    ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── clients ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own clients"  ON public.clients;
DROP POLICY IF EXISTS "admins_view_all_clients"   ON public.clients;

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR (SELECT is_admin()));
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE
  USING    ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── estimates ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own estimates"   ON public.estimates;
DROP POLICY IF EXISTS "admins_view_all_estimates"    ON public.estimates;

CREATE POLICY "estimates_select" ON public.estimates
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR (SELECT is_admin()));
CREATE POLICY "estimates_insert" ON public.estimates
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "estimates_update" ON public.estimates
  FOR UPDATE
  USING    ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "estimates_delete" ON public.estimates
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own profile"   ON public.profiles;
DROP POLICY IF EXISTS "admins_view_all_profiles"   ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id OR (SELECT is_admin()));
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING    ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING ((SELECT auth.uid()) = id);

-- ── web_interest ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_manage_own_web_interest"  ON public.web_interest;
DROP POLICY IF EXISTS "admins_view_all_web_interest"   ON public.web_interest;

CREATE POLICY "web_interest_select" ON public.web_interest
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR (SELECT is_admin()));
CREATE POLICY "web_interest_insert" ON public.web_interest
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "web_interest_update" ON public.web_interest
  FOR UPDATE
  USING    ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "web_interest_delete" ON public.web_interest
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── Missing FK index: web_interest.user_id ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_web_interest_user_id ON public.web_interest(user_id);
