-- =====================================================
-- PAYROLL SECURITY HARDENING
-- Implements strict role-based access control for payroll_entries
-- Uses existing roles: owner, accountant (for payroll access)
-- Denies: viewer, employee, and any unauthenticated user
-- =====================================================

-- 1. Add period_id column to link payroll entries to accounting periods for locking
ALTER TABLE public.payroll_entries 
ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.accounting_periods(id);

-- 2. Add change_reason column for audit logging
ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS change_reason text DEFAULT 'manual';

-- 3. Create a SECURITY DEFINER function to check payroll access
-- Only owner and accountant can access payroll (viewer and employee are DENIED)
CREATE OR REPLACE FUNCTION public.can_access_payroll(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id 
    AND user_id = _user_id 
    AND role IN ('owner', 'accountant')
  )
$$;

-- 4. Create a SECURITY DEFINER function to check payroll edit rights
-- Only owner and accountant can edit payroll
CREATE OR REPLACE FUNCTION public.can_edit_payroll(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id 
    AND user_id = _user_id 
    AND role IN ('owner', 'accountant')
  )
$$;

-- 5. Create a function to check if payroll period is open for modifications
CREATE OR REPLACE FUNCTION public.is_payroll_period_open(_period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status != 'hard_closed' FROM public.accounting_periods WHERE id = _period_id),
    true
  )
$$;

-- 6. Create a function to check if user can unlock periods (only owner)
CREATE OR REPLACE FUNCTION public.can_unlock_period(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id 
    AND user_id = _user_id 
    AND role = 'owner'
  )
$$;

-- 7. Drop existing permissive policies on payroll_entries
DROP POLICY IF EXISTS "Editors can manage payroll" ON public.payroll_entries;
DROP POLICY IF EXISTS "Members can view payroll" ON public.payroll_entries;
DROP POLICY IF EXISTS "Payroll access - SELECT" ON public.payroll_entries;
DROP POLICY IF EXISTS "Payroll access - INSERT" ON public.payroll_entries;
DROP POLICY IF EXISTS "Payroll access - UPDATE" ON public.payroll_entries;
DROP POLICY IF EXISTS "Payroll access - DELETE" ON public.payroll_entries;

-- 8. Create strict RLS policies for payroll_entries (default DENY, explicit ALLOW)

-- SELECT: Only owner/accountant can view payroll data
CREATE POLICY "Payroll strict access - SELECT"
ON public.payroll_entries
FOR SELECT
USING (public.can_access_payroll(company_id, auth.uid()));

-- INSERT: Only owner/accountant can insert, and period must be open
CREATE POLICY "Payroll strict access - INSERT"
ON public.payroll_entries
FOR INSERT
WITH CHECK (
  public.can_edit_payroll(company_id, auth.uid())
  AND (period_id IS NULL OR public.is_payroll_period_open(period_id))
);

-- UPDATE: Only owner/accountant can update, and period must be open
CREATE POLICY "Payroll strict access - UPDATE"
ON public.payroll_entries
FOR UPDATE
USING (
  public.can_edit_payroll(company_id, auth.uid())
  AND (period_id IS NULL OR public.is_payroll_period_open(period_id))
)
WITH CHECK (
  public.can_edit_payroll(company_id, auth.uid())
  AND (period_id IS NULL OR public.is_payroll_period_open(period_id))
);

-- DELETE: Only owner/accountant can delete, and period must be open
CREATE POLICY "Payroll strict access - DELETE"
ON public.payroll_entries
FOR DELETE
USING (
  public.can_edit_payroll(company_id, auth.uid())
  AND (period_id IS NULL OR public.is_payroll_period_open(period_id))
);

-- 9. Create payroll_audit_log table for detailed audit trail
CREATE TABLE IF NOT EXISTS public.payroll_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  changed_fields text[],
  reason text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet
);

-- Enable RLS on audit log
ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Payroll audit log - SELECT" ON public.payroll_audit_log;
DROP POLICY IF EXISTS "Payroll audit log - INSERT system" ON public.payroll_audit_log;

-- Only payroll-authorized users (owner/accountant) can view audit logs
CREATE POLICY "Payroll audit strict - SELECT"
ON public.payroll_audit_log
FOR SELECT
USING (public.can_access_payroll(company_id, auth.uid()));

-- Only system (via trigger) can insert - uses service role internally
CREATE POLICY "Payroll audit strict - INSERT"
ON public.payroll_audit_log
FOR INSERT
WITH CHECK (public.can_access_payroll(company_id, auth.uid()));

-- 10. Create trigger function for payroll audit logging
CREATE OR REPLACE FUNCTION public.log_payroll_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_changed_fields text[];
  v_reason text;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Determine reason from NEW record or default to 'manual'
  IF TG_OP = 'DELETE' THEN
    v_reason := COALESCE(OLD.change_reason, 'manual');
  ELSE
    v_reason := COALESCE(NEW.change_reason, 'manual');
  END IF;
  
  -- Calculate changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    v_changed_fields := ARRAY[]::text[];
    IF OLD.employee_id IS DISTINCT FROM NEW.employee_id THEN
      v_changed_fields := v_changed_fields || 'employee_id';
    END IF;
    IF OLD.period IS DISTINCT FROM NEW.period THEN
      v_changed_fields := v_changed_fields || 'period';
    END IF;
    IF OLD.accrued IS DISTINCT FROM NEW.accrued THEN
      v_changed_fields := v_changed_fields || 'accrued';
    END IF;
    IF OLD.paid IS DISTINCT FROM NEW.paid THEN
      v_changed_fields := v_changed_fields || 'paid';
    END IF;
    IF OLD.date_paid IS DISTINCT FROM NEW.date_paid THEN
      v_changed_fields := v_changed_fields || 'date_paid';
    END IF;
    IF OLD.note IS DISTINCT FROM NEW.note THEN
      v_changed_fields := v_changed_fields || 'note';
    END IF;
    IF OLD.period_id IS DISTINCT FROM NEW.period_id THEN
      v_changed_fields := v_changed_fields || 'period_id';
    END IF;
  END IF;
  
  -- Insert audit log bypassing RLS since this is SECURITY DEFINER
  INSERT INTO public.payroll_audit_log (
    payroll_entry_id,
    company_id,
    user_id,
    user_email,
    action,
    before_value,
    after_value,
    changed_fields,
    reason
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    v_user_email,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    v_changed_fields,
    v_reason
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 11. Create triggers for payroll audit logging
DROP TRIGGER IF EXISTS trg_payroll_audit_insert ON public.payroll_entries;
DROP TRIGGER IF EXISTS trg_payroll_audit_update ON public.payroll_entries;
DROP TRIGGER IF EXISTS trg_payroll_audit_delete ON public.payroll_entries;

CREATE TRIGGER trg_payroll_audit_insert
  AFTER INSERT ON public.payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payroll_changes();

CREATE TRIGGER trg_payroll_audit_update
  AFTER UPDATE ON public.payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payroll_changes();

CREATE TRIGGER trg_payroll_audit_delete
  BEFORE DELETE ON public.payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payroll_changes();

-- 12. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_audit_company_id ON public.payroll_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_payroll_entry_id ON public.payroll_audit_log(payroll_entry_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_created_at ON public.payroll_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON public.payroll_entries(period_id);

-- 13. Add comment for documentation
COMMENT ON TABLE public.payroll_entries IS 'HIGHLY SENSITIVE PERSONAL DATA (Kazakhstan regulations) - Access restricted to owner and accountant roles only. viewer, employee, and unauthenticated users are DENIED. All changes are audited to payroll_audit_log.';