-- Payment tracking columns on estimates
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS deposit_amount     numeric        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid       boolean        DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_at    timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_method     text,
  ADD COLUMN IF NOT EXISTS balance_paid       boolean        DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_paid_at    timestamptz,
  ADD COLUMN IF NOT EXISTS balance_method     text;

-- Change orders table
CREATE TABLE IF NOT EXISTS public.change_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid        REFERENCES public.clients(id) ON DELETE CASCADE,
  estimate_id     uuid        REFERENCES public.estimates(id) ON DELETE SET NULL,
  change_number   text,
  title           text        NOT NULL,
  description     text,
  reason          text,
  amount_change   numeric     DEFAULT 0,
  timeline_impact text,
  status          text        DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','declined','completed')),
  approved_at     timestamptz,
  approved_by     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own change orders" ON public.change_orders;
CREATE POLICY "Users manage own change orders"
  ON public.change_orders FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_change_orders_client_id   ON public.change_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_estimate_id ON public.change_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_user_id     ON public.change_orders(user_id, created_at DESC);
