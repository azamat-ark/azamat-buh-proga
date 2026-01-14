-- =====================================================
-- 1. Create tax_regime enum for Kazakhstan
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.tax_regime AS ENUM ('simplified', 'common', 'retail_tax');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. Add Kazakhstan-specific columns to companies
-- =====================================================
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tax_regime public.tax_regime DEFAULT 'simplified',
ADD COLUMN IF NOT EXISTS is_vat_payer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kbe text DEFAULT '17';

-- =====================================================
-- 3. Drop existing restrictive RLS policies and recreate
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Company members can view companies" ON public.companies;
DROP POLICY IF EXISTS "Owners can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

-- INSERT: any authenticated user can create a company
CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: only members of the company can see it
CREATE POLICY "Members can view their companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_company_member(id, auth.uid()));

-- UPDATE: owners and accountants can update company details
CREATE POLICY "Editors can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.can_edit_company(id, auth.uid()))
WITH CHECK (public.can_edit_company(id, auth.uid()));

-- DELETE: only owners can delete a company
CREATE POLICY "Owners can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.has_company_role(id, auth.uid(), 'owner'::public.app_role));

-- =====================================================
-- 4. Add employee role to app_role enum if missing
-- =====================================================
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;