-- Drop the problematic policies that access auth.users directly
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.invitations;

-- Create a security definer function to safely get user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their invitations"
ON public.invitations
FOR SELECT
USING (lower(email) = lower(public.get_current_user_email()));

CREATE POLICY "Users can accept their invitations"
ON public.invitations
FOR UPDATE
USING (
  lower(email) = lower(public.get_current_user_email())
  AND accepted_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  lower(email) = lower(public.get_current_user_email())
);