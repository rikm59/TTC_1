-- ── 1. Pin search_path on set_updated_at (was mutable) ──────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 2. Pin search_path on set_trial_expiry + revoke public RPC access ────────
CREATE OR REPLACE FUNCTION public.set_trial_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.plan IS NULL OR NEW.plan = 'free') AND NEW.trial_expires_at IS NULL THEN
    NEW.trial_expires_at := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_trial_expiry() FROM anon, authenticated;

-- ── 3. Handle new user: pin search_path, add account_type, revoke RPC ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type, plan, subscription_status, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'account_type', ''), 'contractor'),
    'free',
    'inactive',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ── 4. Revoke anon access to is_admin ────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ── 5. Tighten business-assets bucket: remove broad listing policy,
--       replace with per-user folder access only ───────────────────────────
DROP POLICY IF EXISTS "public_view_business_assets" ON storage.objects;

CREATE POLICY "view_own_business_assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
