-- Account type column for contractor/subcontractor/labor-only role segmentation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'contractor'
    CHECK (account_type IN ('contractor', 'subcontractor', 'labor-only'));

-- Back-fill: pull account_type from auth user metadata for any existing user
-- who signed up after this column was added to the signup flow.
-- Existing users without it remain 'contractor' (the default).
UPDATE public.profiles p
SET account_type = COALESCE(
  NULLIF((SELECT raw_user_meta_data->>'account_type' FROM auth.users WHERE id = p.id), ''),
  'contractor'
)
WHERE p.account_type = 'contractor';
