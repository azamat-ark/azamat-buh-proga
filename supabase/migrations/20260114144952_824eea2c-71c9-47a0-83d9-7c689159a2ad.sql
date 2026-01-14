-- Fix mask_email function search_path
CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN _email IS NULL THEN NULL
      WHEN position('@' in _email) > 2 THEN
        substring(_email from 1 for 2) || '***' || substring(_email from position('@' in _email))
      ELSE '***' || substring(_email from position('@' in _email))
    END
$$;