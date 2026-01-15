-- Create invoice_payments table for proper payment tracking
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add index for faster lookups
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_company_id ON public.invoice_payments(company_id);

-- Enable RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_payments
CREATE POLICY "Members can view invoice payments"
  ON public.invoice_payments
  FOR SELECT
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage invoice payments"
  ON public.invoice_payments
  FOR ALL
  USING (can_edit_company(company_id, auth.uid()));

-- Add amount_due and paid_amount columns to invoices if not exist (they should already exist but let's ensure)
-- Also add partially_paid status to invoice_status enum

-- Add partially_paid status if not exists (this may fail if already exists, which is fine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'partially_paid' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_status')
  ) THEN
    ALTER TYPE public.invoice_status ADD VALUE 'partially_paid' AFTER 'sent';
  END IF;
END
$$;

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_invoice_total NUMERIC;
  v_new_status invoice_status;
BEGIN
  -- Calculate total payments for the invoice
  SELECT COALESCE(SUM(amount), 0), i.total
  INTO v_total_paid, v_invoice_total
  FROM invoices i
  LEFT JOIN invoice_payments ip ON ip.invoice_id = i.id
  WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  GROUP BY i.id, i.total;

  -- Determine new status
  IF v_total_paid >= v_invoice_total THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'sent';
  END IF;

  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = v_total_paid,
    amount_due = total - v_total_paid,
    status = v_new_status,
    updated_at = now()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND status NOT IN ('draft', 'cancelled');

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update invoice status
DROP TRIGGER IF EXISTS update_invoice_on_payment ON public.invoice_payments;
CREATE TRIGGER update_invoice_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status_on_payment();