-- Fix web_interest UPDATE policy to allow admins to update any lead.
-- The prior migration only allowed owners to update; this adds the is_admin() check
-- so AdminPage.tsx updateLeadStatus can succeed for admin users.

DROP POLICY IF EXISTS web_interest_update ON public.web_interest;
DROP POLICY IF EXISTS "web_interest_update" ON public.web_interest;

CREATE POLICY "web_interest_update" ON public.web_interest
  FOR UPDATE
  USING    ((SELECT auth.uid()) = user_id OR (SELECT is_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT is_admin()));
