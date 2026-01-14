-- Enum types for roles and statuses
CREATE TYPE public.app_role AS ENUM ('owner', 'accountant', 'viewer');
CREATE TYPE public.account_type AS ENUM ('bank', 'cash');
CREATE TYPE public.category_type AS ENUM ('income', 'expense');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bin_iin TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  default_currency TEXT DEFAULT 'KZT',
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_next_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE(user_id, role)
);

-- Company members - links users to companies with roles
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'accountant',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  current_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts (bank accounts, cash registers)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'bank',
  currency TEXT DEFAULT 'KZT',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Counterparties (clients/suppliers)
CREATE TABLE public.counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bin_iin TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_client BOOLEAN DEFAULT true,
  is_supplier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items (products/services)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'шт',
  price_default DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'KZT',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice lines
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(15,3) DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) DEFAULT 0
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  salary DECIMAL(15,2) DEFAULT 0,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll entries
CREATE TABLE public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  accrued DECIMAL(15,2) DEFAULT 0,
  paid DECIMAL(15,2) DEFAULT 0,
  date_paid DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- Security definer function to check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id
  )
$$;

-- Security definer function to check company role
CREATE OR REPLACE FUNCTION public.has_company_role(_company_id UUID, _user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user can edit (owner or accountant)
CREATE OR REPLACE FUNCTION public.can_edit_company(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN
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

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies policies
CREATE POLICY "Company members can view companies" ON public.companies
  FOR SELECT USING (public.is_company_member(id, auth.uid()));

CREATE POLICY "Owners can update companies" ON public.companies
  FOR UPDATE USING (public.has_company_role(id, auth.uid(), 'owner'));

CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Company members policies
CREATE POLICY "Members can view company members" ON public.company_members
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Owners can manage company members" ON public.company_members
  FOR ALL USING (public.has_company_role(company_id, auth.uid(), 'owner'));

CREATE POLICY "Users can add themselves as owner to new company" ON public.company_members
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'owner');

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Members can view accounts" ON public.accounts
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage accounts" ON public.accounts
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Categories policies
CREATE POLICY "Members can view categories" ON public.categories
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage categories" ON public.categories
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Counterparties policies
CREATE POLICY "Members can view counterparties" ON public.counterparties
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage counterparties" ON public.counterparties
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Items policies
CREATE POLICY "Members can view items" ON public.items
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage items" ON public.items
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Transactions policies
CREATE POLICY "Members can view transactions" ON public.transactions
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage transactions" ON public.transactions
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Invoices policies
CREATE POLICY "Members can view invoices" ON public.invoices
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage invoices" ON public.invoices
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Invoice lines policies
CREATE POLICY "Members can view invoice lines" ON public.invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
      AND public.is_company_member(i.company_id, auth.uid())
    )
  );

CREATE POLICY "Editors can manage invoice lines" ON public.invoice_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
      AND public.can_edit_company(i.company_id, auth.uid())
    )
  );

-- Payments policies
CREATE POLICY "Members can view payments" ON public.payments
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage payments" ON public.payments
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Employees policies
CREATE POLICY "Members can view employees" ON public.employees
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage employees" ON public.employees
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Payroll entries policies
CREATE POLICY "Members can view payroll" ON public.payroll_entries
  FOR SELECT USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Editors can manage payroll" ON public.payroll_entries
  FOR ALL USING (public.can_edit_company(company_id, auth.uid()));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update account balance
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Indexes for better performance
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, date);
CREATE INDEX idx_invoices_company_status ON public.invoices(company_id, status);
CREATE INDEX idx_accounts_company ON public.accounts(company_id);
CREATE INDEX idx_categories_company ON public.categories(company_id);
CREATE INDEX idx_counterparties_company ON public.counterparties(company_id);