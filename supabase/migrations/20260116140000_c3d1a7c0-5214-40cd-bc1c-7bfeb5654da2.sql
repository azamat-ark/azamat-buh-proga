-- Enable RLS for journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT (journal_entries)
CREATE POLICY "Users can insert journal entries for their companies"
ON public.journal_entries
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

-- Policy for SELECT (journal_entries)
CREATE POLICY "Users can view journal entries of their companies"
ON public.journal_entries
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS for journal_lines
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT (journal_lines)
CREATE POLICY "Users can insert journal lines for their companies' entries"
ON public.journal_lines
FOR INSERT
WITH CHECK (
  entry_id IN (
    SELECT id
    FROM public.journal_entries
    WHERE company_id IN (
      SELECT company_id
      FROM public.company_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy for SELECT (journal_lines)
CREATE POLICY "Users can view journal lines of their companies' entries"
ON public.journal_lines
FOR SELECT
USING (
  entry_id IN (
    SELECT id
    FROM public.journal_entries
    WHERE company_id IN (
      SELECT company_id
      FROM public.company_members
      WHERE user_id = auth.uid()
    )
  )
);
