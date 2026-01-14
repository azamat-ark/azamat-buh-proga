-- Create invitations table for user invitations
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Owners can manage invitations
CREATE POLICY "Owners can manage invitations"
ON public.invitations
FOR ALL
USING (has_company_role(company_id, auth.uid(), 'owner'));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
ON public.invitations
FOR SELECT
USING (
  lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Users can accept invitations sent to their email
CREATE POLICY "Users can accept their invitations"
ON public.invitations
FOR UPDATE
USING (
  lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  AND accepted_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);