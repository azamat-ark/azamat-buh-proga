-- ==========================================
-- PAYROLL MODULE ENHANCEMENTS
-- ==========================================

-- Add employment types enum
CREATE TYPE public.employment_type AS ENUM ('full_time', 'contractor');

-- Add salary types enum  
CREATE TYPE public.salary_type AS ENUM ('monthly', 'hourly');

-- Enhance employees table with Kazakhstan-specific fields
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS iin TEXT,
ADD COLUMN IF NOT EXISTS employment_type public.employment_type DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS salary_type public.salary_type DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_tax_resident BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add comment for IIN validation (12 digits)
COMMENT ON COLUMN public.employees.iin IS 'Individual Identification Number (ИИН) - 12 digits';

-- Add payroll calculation fields to payroll_entries
ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS gross_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS opv NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vosms_employee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ipn NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_tax NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_contributions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vosms_employer NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS worked_hours NUMERIC,
ADD COLUMN IF NOT EXISTS worked_days INTEGER,
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id);

-- ==========================================
-- VAT SUPPORT
-- ==========================================

-- Add VAT rate enum
CREATE TYPE public.vat_rate AS ENUM ('0', '5', '12', 'exempt');

-- Add VAT fields to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS vat_rate public.vat_rate DEFAULT 'exempt',
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_amount NUMERIC;

-- Add VAT fields to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS vat_rate public.vat_rate DEFAULT 'exempt';

-- Add VAT fields to invoice lines
ALTER TABLE public.invoice_lines
ADD COLUMN IF NOT EXISTS vat_rate public.vat_rate DEFAULT 'exempt',
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_amount NUMERIC;

-- ==========================================
-- JOURNAL ENTRY BALANCE TRACKING
-- ==========================================

-- Add account balance tracking table
CREATE TABLE IF NOT EXISTS public.account_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opening_debit NUMERIC DEFAULT 0,
  opening_credit NUMERIC DEFAULT 0,
  turnover_debit NUMERIC DEFAULT 0,
  turnover_credit NUMERIC DEFAULT 0,
  closing_debit NUMERIC DEFAULT 0,
  closing_credit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, period_id)
);

ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view account balances"
ON public.account_balances
FOR SELECT
USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage account balances"
ON public.account_balances
FOR ALL
USING (can_edit_company(company_id, auth.uid()));

-- ==========================================
-- PAYMENT TRACKING FOR INVOICES
-- ==========================================

-- Add paid_amount to invoices for tracking partial payments
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_transactions_vat ON public.transactions(vat_rate) WHERE vat_rate != 'exempt';
CREATE INDEX IF NOT EXISTS idx_employees_iin ON public.employees(iin);
CREATE INDEX IF NOT EXISTS idx_payroll_journal ON public.payroll_entries(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON public.account_balances(period_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON public.account_balances(account_id);