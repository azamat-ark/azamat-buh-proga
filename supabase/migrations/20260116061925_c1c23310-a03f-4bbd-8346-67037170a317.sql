-- Add CHECK constraint to enforce IIN format at database level
-- IIN must be either NULL or exactly 12 digits
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_iin_format;

ALTER TABLE public.employees
ADD CONSTRAINT employees_iin_format
CHECK (iin IS NULL OR iin ~ '^[0-9]{12}$');