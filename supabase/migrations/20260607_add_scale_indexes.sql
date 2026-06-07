-- Scale protection: database indexes for 1000-user load
-- Applied 2026-06-07 via Supabase MCP (add_scale_indexes migration)

-- ── clients ──────────────────────────────────────────────────────────────
-- Composite covering index for main CRM query:
--   .eq('user_id', uid).order('updated_at', { ascending: false })
CREATE INDEX IF NOT EXISTS clients_user_id_updated_at_idx
  ON public.clients (user_id, updated_at DESC);

-- Status filtering in CRM stats
CREATE INDEX IF NOT EXISTS clients_status_idx
  ON public.clients (status)
  WHERE status IS NOT NULL;

-- ── estimates ────────────────────────────────────────────────────────────
-- Composite for estimates list ordered by newest first
CREATE INDEX IF NOT EXISTS estimates_user_id_created_at_idx
  ON public.estimates (user_id, created_at DESC);

-- Status filter (draft/sent/accepted/declined)
CREATE INDEX IF NOT EXISTS estimates_status_idx
  ON public.estimates (status)
  WHERE status IS NOT NULL;

-- ── client_notes ─────────────────────────────────────────────────────────
-- FK join: every notes panel does .eq('client_id', cid)
CREATE INDEX IF NOT EXISTS client_notes_client_id_idx
  ON public.client_notes (client_id);

CREATE INDEX IF NOT EXISTS client_notes_user_id_idx
  ON public.client_notes (user_id);

-- Combined for the typical fetch: .eq('client_id').eq('user_id')
CREATE INDEX IF NOT EXISTS client_notes_client_user_idx
  ON public.client_notes (client_id, user_id);

-- ── web_interest ─────────────────────────────────────────────────────────
-- Admin dashboard: filter by status, order by newest
CREATE INDEX IF NOT EXISTS web_interest_status_idx
  ON public.web_interest (status);

CREATE INDEX IF NOT EXISTS web_interest_created_at_idx
  ON public.web_interest (created_at DESC);

CREATE INDEX IF NOT EXISTS web_interest_status_created_at_idx
  ON public.web_interest (status, created_at DESC);

-- ── profiles ─────────────────────────────────────────────────────────────
-- Admin user list filtered by plan (free/pro/enterprise)
CREATE INDEX IF NOT EXISTS profiles_plan_idx
  ON public.profiles (plan)
  WHERE plan IS NOT NULL;

-- Subscription status filter
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx
  ON public.profiles (subscription_status)
  WHERE subscription_status IS NOT NULL;

-- Trial expiry cron: find rows where trial_expires_at < now()
CREATE INDEX IF NOT EXISTS profiles_trial_expires_at_idx
  ON public.profiles (trial_expires_at)
  WHERE trial_expires_at IS NOT NULL;

-- Sort users by join date in admin panel
CREATE INDEX IF NOT EXISTS profiles_created_at_idx
  ON public.profiles (created_at DESC);

-- ── admin_audit_log ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_idx
  ON public.admin_audit_log (target_user_id)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON public.admin_audit_log (created_at DESC);
