-- =====================================================
-- ACCOUNTING PERIODS: CORE ARCHITECTURE FIX
-- =====================================================

-- 1. Add period_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN period_id UUID REFERENCES public.accounting_periods(id);

-- 2. Add period_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN period_id UUID REFERENCES public.accounting_periods(id);

-- 3. Create index for faster period lookups
CREATE INDEX IF NOT EXISTS idx_transactions_period_id ON public.transactions(period_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period_id ON public.invoices(period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period_id ON public.journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON public.payroll_entries(period_id);

-- 4. Create a composite index for period date lookups
CREATE INDEX IF NOT EXISTS idx_accounting_periods_company_dates 
ON public.accounting_periods(company_id, start_date, end_date);

-- 5. Create function to find period_id from date
CREATE OR REPLACE FUNCTION public.get_period_for_date(_company_id UUID, _date DATE)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.accounting_periods
  WHERE company_id = _company_id
    AND _date >= start_date
    AND _date <= end_date
  LIMIT 1
$$;

-- 6. Create function to check if period allows writes
CREATE OR REPLACE FUNCTION public.can_write_to_period(_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'open' FROM public.accounting_periods WHERE id = _period_id),
    false
  )
$$;

-- 7. Create function to get period status message
CREATE OR REPLACE FUNCTION public.get_period_status_message(_period_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN status = 'open' THEN 'Период открыт'
    WHEN status = 'soft_closed' THEN 'Период закрыт (мягко). Изменения невозможны.'
    WHEN status = 'hard_closed' THEN 'Период закрыт окончательно. Изменения невозможны.'
    ELSE 'Неизвестный статус периода'
  END
  FROM public.accounting_periods 
  WHERE id = _period_id
$$;

-- 8. Update check_period_status function to block soft_closed AND hard_closed
CREATE OR REPLACE FUNCTION public.check_period_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_stat period_status;
  period_name TEXT;
BEGIN
  -- Get period status and name
  SELECT status, name INTO period_stat, period_name
  FROM public.accounting_periods
  WHERE id = NEW.period_id;
  
  -- Block if period is closed (soft or hard)
  IF period_stat IN ('soft_closed', 'hard_closed') THEN
    RAISE EXCEPTION 'Невозможно создать или изменить запись: период "%" закрыт', period_name;
  END IF;
  
  -- Also validate that period exists
  IF period_stat IS NULL AND NEW.period_id IS NOT NULL THEN
    RAISE EXCEPTION 'Указанный учётный период не найден';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Create trigger for transactions to enforce period status
CREATE OR REPLACE FUNCTION public.check_transaction_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_stat period_status;
  period_name TEXT;
BEGIN
  -- Skip if no period assigned
  IF NEW.period_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get period status and name
  SELECT status, name INTO period_stat, period_name
  FROM public.accounting_periods
  WHERE id = NEW.period_id;
  
  -- Block if period is closed
  IF period_stat IN ('soft_closed', 'hard_closed') THEN
    RAISE EXCEPTION 'Невозможно создать или изменить транзакцию: период "%" закрыт', period_name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_transaction_period_trigger ON public.transactions;
CREATE TRIGGER check_transaction_period_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_transaction_period();

-- 10. Create trigger for invoices to enforce period status
CREATE OR REPLACE FUNCTION public.check_invoice_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_stat period_status;
  period_name TEXT;
BEGIN
  -- Skip if no period assigned
  IF NEW.period_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get period status and name
  SELECT status, name INTO period_stat, period_name
  FROM public.accounting_periods
  WHERE id = NEW.period_id;
  
  -- Block if period is closed
  IF period_stat IN ('soft_closed', 'hard_closed') THEN
    RAISE EXCEPTION 'Невозможно создать или изменить счёт: период "%" закрыт', period_name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_invoice_period_trigger ON public.invoices;
CREATE TRIGGER check_invoice_period_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invoice_period();

-- 11. Update is_payroll_period_open to block soft_closed as well
CREATE OR REPLACE FUNCTION public.is_payroll_period_open(_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'open' FROM public.accounting_periods WHERE id = _period_id),
    -- If no period_id provided, allow (for backwards compatibility)
    true
  )
$$;

-- 12. Add constraint to enforce only one open period per company (via trigger)
CREATE OR REPLACE FUNCTION public.enforce_single_open_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_count INTEGER;
BEGIN
  -- Only check when setting status to 'open'
  IF NEW.status = 'open' THEN
    SELECT COUNT(*) INTO open_count
    FROM public.accounting_periods
    WHERE company_id = NEW.company_id
      AND status = 'open'
      AND id != NEW.id;
    
    IF open_count > 0 THEN
      RAISE EXCEPTION 'Может быть только один открытый период. Закройте текущий открытый период перед открытием нового.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_open_period_trigger ON public.accounting_periods;
CREATE TRIGGER enforce_single_open_period_trigger
  BEFORE INSERT OR UPDATE ON public.accounting_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_open_period();

-- 13. Add function to auto-assign period based on date
CREATE OR REPLACE FUNCTION public.auto_assign_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_period_id UUID;
BEGIN
  -- Only auto-assign if period_id is not already set
  IF NEW.period_id IS NULL AND NEW.date IS NOT NULL AND NEW.company_id IS NOT NULL THEN
    SELECT id INTO found_period_id
    FROM public.accounting_periods
    WHERE company_id = NEW.company_id
      AND NEW.date >= start_date
      AND NEW.date <= end_date
    LIMIT 1;
    
    IF found_period_id IS NOT NULL THEN
      NEW.period_id := found_period_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply auto-assign trigger to transactions
DROP TRIGGER IF EXISTS auto_assign_period_transactions ON public.transactions;
CREATE TRIGGER auto_assign_period_transactions
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_period();

-- Apply auto-assign trigger to invoices
DROP TRIGGER IF EXISTS auto_assign_period_invoices ON public.invoices;
CREATE TRIGGER auto_assign_period_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_period();