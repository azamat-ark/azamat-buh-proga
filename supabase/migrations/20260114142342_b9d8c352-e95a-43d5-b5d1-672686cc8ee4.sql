-- =====================================================
-- PHASE 1: ACCOUNTING CORE DATABASE SCHEMA
-- Kazakhstan-compliant Chart of Accounts, Double-Entry Ledger
-- =====================================================

-- 1. ENUMS
-- Account types following Kazakhstan accounting standards
CREATE TYPE public.account_type_class AS ENUM (
  'asset',
  'liability', 
  'equity',
  'revenue',
  'expense'
);

-- Journal entry status (append-only ledger pattern)
CREATE TYPE public.journal_status AS ENUM (
  'draft',
  'posted',
  'reversed'
);

-- Accounting period status
CREATE TYPE public.period_status AS ENUM (
  'open',
  'soft_closed',
  'hard_closed'
);

-- Chart of accounts standard template
CREATE TYPE public.coa_standard AS ENUM (
  'nsfo',
  'ifrs'
);

-- 2. CHART OF ACCOUNTS (Hierarchical, multi-tenant)
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_kz TEXT, -- Kazakh translation
  account_class account_type_class NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Cannot be deleted if true
  allow_manual_entry BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Index for hierarchical queries
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(parent_id);
CREATE INDEX idx_coa_company ON public.chart_of_accounts(company_id);
CREATE INDEX idx_coa_code ON public.chart_of_accounts(company_id, code);

-- 3. ACCOUNTING PERIODS
CREATE TABLE public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Январь 2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status period_status DEFAULT 'open',
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, start_date, end_date)
);

CREATE INDEX idx_periods_company ON public.accounting_periods(company_id);
CREATE INDEX idx_periods_dates ON public.accounting_periods(company_id, start_date, end_date);

-- 4. DOCUMENT TYPES (for traceability)
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_kz TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT false
);

-- Seed system document types
INSERT INTO public.document_types (code, name, name_kz, is_system) VALUES
  ('MANUAL', 'Ручная проводка', 'Қолмен жазу', true),
  ('INVOICE', 'Счёт-фактура', 'Шот-фактура', true),
  ('PAYMENT', 'Платёж', 'Төлем', true),
  ('RECEIPT', 'Приход', 'Кіріс', true),
  ('EXPENSE', 'Расход', 'Шығыс', true),
  ('PAYROLL', 'Зарплата', 'Еңбекақы', true),
  ('ADJUSTMENT', 'Корректировка', 'Түзету', true),
  ('REVERSAL', 'Сторнирование', 'Сторно', true),
  ('OPENING', 'Входящие остатки', 'Кіру қалдықтары', true),
  ('CLOSING', 'Закрытие периода', 'Кезеңді жабу', true);

-- 5. JOURNAL ENTRIES (Header)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL, -- Auto-generated sequence per company
  date DATE NOT NULL,
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id),
  document_type_id UUID REFERENCES public.document_types(id),
  document_id UUID, -- Reference to source document (invoice, payment, etc.)
  description TEXT,
  status journal_status DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reversal_entry_id UUID REFERENCES public.journal_entries(id), -- Link to reversal entry
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entry_number)
);

CREATE INDEX idx_je_company ON public.journal_entries(company_id);
CREATE INDEX idx_je_period ON public.journal_entries(period_id);
CREATE INDEX idx_je_date ON public.journal_entries(company_id, date);
CREATE INDEX idx_je_status ON public.journal_entries(status);
CREATE INDEX idx_je_document ON public.journal_entries(document_type_id, document_id);

-- 6. JOURNAL LINES (Debit/Credit lines)
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit NUMERIC(18,2) DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18,2) DEFAULT 0 CHECK (credit >= 0),
  currency TEXT DEFAULT 'KZT',
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  amount_currency NUMERIC(18,2), -- Original currency amount
  description TEXT,
  -- Analytic dimensions (JSONB for flexibility)
  dimensions JSONB DEFAULT '{}',
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT debit_xor_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0) OR (debit = 0 AND credit = 0)
  )
);

CREATE INDEX idx_jl_entry ON public.journal_lines(entry_id);
CREATE INDEX idx_jl_account ON public.journal_lines(account_id);

-- 7. AUDIT LOG (Immutable, append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_company ON public.audit_logs(company_id);
CREATE INDEX idx_audit_table ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_date ON public.audit_logs(created_at);

-- 8. DIMENSIONS (for analytic accounting)
CREATE TABLE public.dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'project', 'branch', 'cost_center', 'contract'
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES public.dimensions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, type, code)
);

CREATE INDEX idx_dim_company ON public.dimensions(company_id);
CREATE INDEX idx_dim_type ON public.dimensions(company_id, type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Chart of Accounts policies
CREATE POLICY "Members can view chart of accounts"
  ON public.chart_of_accounts FOR SELECT
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage chart of accounts"
  ON public.chart_of_accounts FOR ALL
  USING (public.can_edit_company(company_id, auth.uid()));

-- Accounting Periods policies
CREATE POLICY "Members can view accounting periods"
  ON public.accounting_periods FOR SELECT
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage accounting periods"
  ON public.accounting_periods FOR ALL
  USING (public.can_edit_company(company_id, auth.uid()));

-- Journal Entries policies
CREATE POLICY "Members can view journal entries"
  ON public.journal_entries FOR SELECT
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage journal entries"
  ON public.journal_entries FOR ALL
  USING (public.can_edit_company(company_id, auth.uid()));

-- Journal Lines policies (via journal entry)
CREATE POLICY "Members can view journal lines"
  ON public.journal_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_lines.entry_id
    AND public.is_company_member(je.company_id, auth.uid())
  ));

CREATE POLICY "Editors can manage journal lines"
  ON public.journal_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_lines.entry_id
    AND public.can_edit_company(je.company_id, auth.uid())
  ));

-- Audit Logs policies (read-only for members)
CREATE POLICY "Members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- Dimensions policies
CREATE POLICY "Members can view dimensions"
  ON public.dimensions FOR SELECT
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage dimensions"
  ON public.dimensions FOR ALL
  USING (public.can_edit_company(company_id, auth.uid()));

-- Document types are public read
CREATE POLICY "Anyone can view document types"
  ON public.document_types FOR SELECT
  USING (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to validate journal entry balance (Debit = Credit)
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_debit NUMERIC;
  total_credit NUMERIC;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM public.journal_lines
  WHERE entry_id = NEW.id;
  
  IF NEW.status = 'posted' AND total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced: Debit (%) != Credit (%)', total_debit, total_credit;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to validate balance before posting
CREATE TRIGGER validate_journal_balance_trigger
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  WHEN (NEW.status = 'posted' AND OLD.status = 'draft')
  EXECUTE FUNCTION public.validate_journal_balance();

-- Function to prevent editing posted entries
CREATE OR REPLACE FUNCTION public.prevent_posted_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'posted' AND NEW.status != 'reversed' THEN
    RAISE EXCEPTION 'Cannot edit posted journal entry. Use reversal instead.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_posted_edit_trigger
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  WHEN (OLD.status = 'posted')
  EXECUTE FUNCTION public.prevent_posted_edit();

-- Function to prevent posting to closed period
CREATE OR REPLACE FUNCTION public.check_period_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_stat period_status;
BEGIN
  SELECT status INTO period_stat
  FROM public.accounting_periods
  WHERE id = NEW.period_id;
  
  IF period_stat = 'hard_closed' THEN
    RAISE EXCEPTION 'Cannot post to a closed accounting period';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_period_status_trigger
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.check_period_status();

-- Function to generate journal entry number
CREATE OR REPLACE FUNCTION public.generate_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := to_char(NEW.date, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
  AND entry_number LIKE year_prefix || '-%';
  
  NEW.entry_number := year_prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_entry_number_trigger
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW
  WHEN (NEW.entry_number IS NULL)
  EXECUTE FUNCTION public.generate_entry_number();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_coa_timestamp
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_je_timestamp
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add coa_standard column to companies for template tracking
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS coa_standard coa_standard DEFAULT 'nsfo';

-- Add fiscal_year_start to companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1 CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12);