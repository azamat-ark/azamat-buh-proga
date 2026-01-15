-- ================================================
-- 1. TAX SETTINGS TABLE (per company, per year)
-- ================================================
CREATE TABLE public.tax_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  mrp INTEGER NOT NULL DEFAULT 3692,
  mzp INTEGER NOT NULL DEFAULT 85000,
  opv_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  opv_cap_mzp INTEGER NOT NULL DEFAULT 50,
  vosms_employee_rate NUMERIC(5,4) NOT NULL DEFAULT 0.02,
  vosms_employer_rate NUMERIC(5,4) NOT NULL DEFAULT 0.03,
  ipn_resident_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  ipn_nonresident_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  standard_deduction_mrp INTEGER NOT NULL DEFAULT 14,
  social_tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.095,
  social_contrib_rate NUMERIC(5,4) NOT NULL DEFAULT 0.035,
  social_contrib_min_mzp INTEGER NOT NULL DEFAULT 1,
  social_contrib_max_mzp INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, year)
);

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tax settings"
  ON public.tax_settings FOR SELECT
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage tax settings"
  ON public.tax_settings FOR ALL
  USING (can_edit_company(company_id, auth.uid()));

-- ================================================
-- 2. ADD EMPLOYEE FLAGS FOR DEDUCTION RULES
-- ================================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS apply_opv BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_vosms_employee BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_vosms_employer BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_social_tax BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_social_contributions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_standard_deduction BOOLEAN NOT NULL DEFAULT true;

-- ================================================
-- 3. UPDATE PAYROLL_ENTRIES WITH PROPER COLUMNS
-- ================================================
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS net_salary NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_income NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_deduction NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_employee_deductions NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_employer_cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opv_base NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_tax_base NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_contrib_base NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_settings_id UUID REFERENCES public.tax_settings(id);

-- Rename confusing columns (accrued -> gross_salary already exists, paid -> net already done)
-- We keep gross_salary, add net_salary. Remove accrued/paid ambiguity.
-- If accrued/paid exist, we'll migrate data but the columns are already renamed via net_salary

-- ================================================
-- 4. PAYROLL ACCOUNT MAPPINGS TABLE
-- ================================================
CREATE TABLE public.payroll_account_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, mapping_type)
);

ALTER TABLE public.payroll_account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payroll account mappings"
  ON public.payroll_account_mappings FOR SELECT
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage payroll account mappings"
  ON public.payroll_account_mappings FOR ALL
  USING (can_edit_company(company_id, auth.uid()));

-- ================================================
-- 5. ADD ACCOUNT GROUPING FLAGS TO CHART OF ACCOUNTS
-- ================================================
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS balance_sheet_group TEXT,
  ADD COLUMN IF NOT EXISTS pl_group TEXT;

-- ================================================
-- 6. ADD INVOICE PAYMENT TRACKING
-- ================================================
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(12,2) DEFAULT 0;

-- Update existing invoices to set amount_due = total - paid_amount
UPDATE public.invoices SET amount_due = COALESCE(total, 0) - COALESCE(paid_amount, 0);

-- Add invoice_id to transactions for payment linking
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

-- ================================================
-- 7. CREATE DOCUMENT TYPE FOR PAYROLL IF NOT EXISTS
-- ================================================
INSERT INTO public.document_types (code, name, name_kz, description, is_system)
VALUES ('PAYROLL', 'Начисление заработной платы', 'Жалақы есептеу', 'Payroll accrual document', true)
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- 8. CREATE DEFAULT TAX SETTINGS FOR 2024 AND 2025
-- ================================================
-- This will be done per-company when needed via the app