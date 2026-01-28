-- Create tax_regime enum
CREATE TYPE public.tax_regime AS ENUM ('general', 'simplified', 'retail');

-- Add tax_regime to companies
ALTER TABLE public.companies ADD COLUMN tax_regime tax_regime DEFAULT 'general';

-- Create tax_constants table
CREATE TABLE public.tax_constants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  year INTEGER NOT NULL,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for tax_constants (readable by all authenticated users, managed by admins - assuming no admin interface yet so just readonly for now or insertable by migration/seeds)
ALTER TABLE public.tax_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tax constants"
ON public.tax_constants
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create currency_rates table
CREATE TABLE public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  currency CHAR(3) NOT NULL,
  rate DECIMAL(15, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, currency)
);

-- Enable RLS for currency_rates
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view currency rates"
ON public.currency_rates
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert currency rates (e.g. triggered by client)
-- Ideally this should be server-side only, but for now we allow client-side service to update it
CREATE POLICY "Authenticated users can insert currency rates"
ON public.currency_rates
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Update items table with compliance fields
ALTER TABLE public.items
ADD COLUMN nkt_code TEXT,
ADD COLUMN gtin TEXT;

-- Seed initial tax constants for 2024 and 2025
INSERT INTO public.tax_constants (name, value, year) VALUES
('MRP', 3692, 2024),
('MZP', 85000, 2024),
('MRP', 3932, 2025),
('MZP', 85000, 2025);
