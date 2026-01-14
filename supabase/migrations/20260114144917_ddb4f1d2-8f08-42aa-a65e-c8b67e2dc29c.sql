-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 0: CRITICAL BUG FIX - Company Creation via Secure RPC
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create the secure RPC function for company creation
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  _company_name text,
  _bin_iin text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- Validate: user must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: user must be logged in to create a company';
  END IF;
  
  -- Validate: company name is required and not empty
  IF _company_name IS NULL OR trim(_company_name) = '' THEN
    RAISE EXCEPTION 'Company name is required and cannot be empty';
  END IF;
  
  -- Validate: company name length
  IF length(trim(_company_name)) > 255 THEN
    RAISE EXCEPTION 'Company name must be 255 characters or less';
  END IF;
  
  -- Validate: BIN/IIN format (Kazakhstan: 12 digits)
  IF _bin_iin IS NOT NULL AND trim(_bin_iin) != '' THEN
    IF NOT (_bin_iin ~ '^[0-9]{12}$') THEN
      RAISE EXCEPTION 'BIN/IIN must be exactly 12 digits';
    END IF;
  END IF;
  
  -- Generate company ID
  v_company_id := gen_random_uuid();
  
  -- Insert company (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.companies (id, name, bin_iin)
  VALUES (v_company_id, trim(_company_name), NULLIF(trim(_bin_iin), ''));
  
  -- Insert owner membership
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner');
  
  -- Return the company ID
  RETURN v_company_id;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(text, text) TO authenticated;

-- 3. Revoke the permissive INSERT policy on companies
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

-- 4. Create a restrictive policy - only via RPC (SECURITY DEFINER functions bypass RLS)
-- No direct INSERT allowed from client
CREATE POLICY "Companies insert via RPC only"
ON public.companies
FOR INSERT
WITH CHECK (false);

-- Note: SECURITY DEFINER functions bypass RLS, so the RPC can still insert

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B3: Remove USING(true) from company_members INSERT policy
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the policy that allows users to add themselves as owner
DROP POLICY IF EXISTS "Users can add themselves as owner to new company" ON public.company_members;

-- Owner membership is now only created via the RPC function

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B1: EMAIL & PII PROTECTION - Enhance profiles table
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add display_name column if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text;

-- Create a function to mask email addresses
CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN _email IS NULL THEN NULL
      WHEN position('@' in _email) > 2 THEN
        substring(_email from 1 for 2) || '***' || substring(_email from position('@' in _email))
      ELSE '***' || substring(_email from position('@' in _email))
    END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B2: INPUT VALIDATION - Database-level constraints
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add check constraints for amounts (must be non-negative)
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_amount_positive;
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_amount_positive CHECK (amount >= 0);

ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_amounts_positive;
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_amounts_positive CHECK (subtotal >= 0 AND total >= 0 AND tax_amount >= 0);

ALTER TABLE public.invoice_lines
DROP CONSTRAINT IF EXISTS invoice_lines_amounts_positive;
ALTER TABLE public.invoice_lines
ADD CONSTRAINT invoice_lines_amounts_positive CHECK (quantity >= 0 AND price >= 0 AND line_total >= 0);

ALTER TABLE public.payroll_entries
DROP CONSTRAINT IF EXISTS payroll_amounts_positive;
ALTER TABLE public.payroll_entries
ADD CONSTRAINT payroll_amounts_positive CHECK (accrued >= 0 AND paid >= 0);

ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_salary_positive;
ALTER TABLE public.employees
ADD CONSTRAINT employees_salary_positive CHECK (salary >= 0);

ALTER TABLE public.items
DROP CONSTRAINT IF EXISTS items_price_positive;
ALTER TABLE public.items
ADD CONSTRAINT items_price_positive CHECK (price_default >= 0);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B3: Harden employees table (salary is sensitive)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Editors can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Members can view employees" ON public.employees;

-- Create strict policies - salary data only for owner/accountant
CREATE POLICY "Payroll roles can view employees with salary"
ON public.employees
FOR SELECT
USING (public.can_access_payroll(company_id, auth.uid()));

CREATE POLICY "Payroll roles can manage employees"
ON public.employees
FOR ALL
USING (public.can_edit_payroll(company_id, auth.uid()))
WITH CHECK (public.can_edit_payroll(company_id, auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B3: Harden counterparties (sensitive business data)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Editors can manage counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Members can view counterparties" ON public.counterparties;

-- Only editors (owner/accountant) can access counterparties
CREATE POLICY "Editors can view counterparties"
ON public.counterparties
FOR SELECT
USING (public.can_edit_company(company_id, auth.uid()));

CREATE POLICY "Editors can manage counterparties"
ON public.counterparties
FOR ALL
USING (public.can_edit_company(company_id, auth.uid()))
WITH CHECK (public.can_edit_company(company_id, auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE B3: Harden audit_logs (surveillance data)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only owner can view audit logs
CREATE POLICY "Owners can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_company_role(company_id, auth.uid(), 'owner'));

-- System can insert (via triggers)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE D: Harden payroll_audit_log - only owner can view
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Payroll audit strict - SELECT" ON public.payroll_audit_log;

-- Only owner can view payroll audit logs
CREATE POLICY "Owners can view payroll audit"
ON public.payroll_audit_log
FOR SELECT
USING (public.has_company_role(company_id, auth.uid(), 'owner'));