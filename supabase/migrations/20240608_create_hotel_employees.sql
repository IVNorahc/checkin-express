-- ── hotel_employees table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hotel_employees (
  id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id    UUID                     NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  user_id     UUID                     REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT                     NOT NULL,
  nom         TEXT                     NOT NULL,
  role        TEXT                     NOT NULL DEFAULT 'receptionniste',
  status      TEXT                     NOT NULL DEFAULT 'pending', -- pending | active | inactive
  invited_by  UUID                     REFERENCES auth.users(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotel_employees_hotel_id_idx  ON public.hotel_employees(hotel_id);
CREATE INDEX IF NOT EXISTS hotel_employees_user_id_idx   ON public.hotel_employees(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS hotel_employees_hotel_email_idx ON public.hotel_employees(hotel_id, email);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.hotel_employees ENABLE ROW LEVEL SECURITY;

-- Hotel owners: full control over their hotel's employees
CREATE POLICY "owners_manage_employees" ON public.hotel_employees
  FOR ALL USING (
    hotel_id IN (SELECT id FROM public.hotels WHERE user_id = auth.uid())
  );

-- Employees can view their own row once linked (user_id = uid)
-- OR see their pending invite (matched by email from JWT before user_id is linked)
CREATE POLICY "employees_view_own" ON public.hotel_employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR (email = (auth.jwt() ->> 'email') AND status = 'pending')
  );

-- ── Helper: link employee account on first login ────────────────────────────────
-- SECURITY DEFINER bypasses RLS so the employee (who has no user_id yet)
-- can update their own pending row.

CREATE OR REPLACE FUNCTION public.link_employee_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hotel_employees
  SET    user_id = auth.uid(),
         status  = 'active'
  WHERE  email   = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND  status  = 'pending'
    AND  user_id IS NULL;
END;
$$;

-- ── clients table: add RLS policy for hotel employees ──────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  tablename  = 'clients'
      AND  policyname = 'employees_access_clients'
  ) THEN
    EXECUTE '
      CREATE POLICY "employees_access_clients" ON public.clients
      FOR ALL USING (
        hotel_id IN (
          SELECT hotel_id
          FROM   public.hotel_employees
          WHERE  user_id = auth.uid()
            AND  status  = ''active''
        )
      )
    ';
  END IF;
END $$;
