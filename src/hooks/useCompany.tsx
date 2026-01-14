import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyMember = Database['public']['Tables']['company_members']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface CompanyWithRole extends Company {
  role: AppRole;
}

interface CompanyContextType {
  currentCompany: CompanyWithRole | null;
  companies: CompanyWithRole[];
  isLoading: boolean;
  userRole: AppRole | null;
  setCurrentCompany: (company: CompanyWithRole) => void;
  createCompany: (input: { name: string; bin_iin?: string | null }) => Promise<Company>;
  refetchCompanies: () => void;
  canEdit: boolean;
  isOwner: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const { data: companies = [], isLoading, refetch: refetchCompanies } = useQuery({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: memberships, error: memberError } = await supabase
        .from('company_members')
        .select('company_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberships.length) return [];

      const companyIds = memberships.map(m => m.company_id);
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds);

      if (companiesError) throw companiesError;

      return companiesData.map(company => ({
        ...company,
        role: memberships.find(m => m.company_id === company.id)?.role as AppRole,
      }));
    },
    enabled: !!user,
  });

  const currentCompany = companies.find(c => c.id === currentCompanyId) || companies[0] || null;

  useEffect(() => {
    if (companies.length > 0 && !currentCompanyId) {
      setCurrentCompanyId(companies[0].id);
    }
  }, [companies, currentCompanyId]);

  const createCompanyMutation = useMutation({
    mutationFn: async (input: { name: string; bin_iin?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const { name, bin_iin } = input;

      // IMPORTANT: do not request RETURNING rows here, otherwise RLS SELECT policy on
      // companies can block the response before the creator is added as a member.
      // Also ensure the request is made with an auth token (some environments can lose it).
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Сессия не активна. Выйдите и войдите заново.');

      const authedSupabase = createClient<Database>(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            storage: undefined as any,
          },
        }
      );

      const companyId = crypto.randomUUID();

      const { error: companyError } = await authedSupabase
        .from('companies')
        .insert({
          id: companyId,
          name,
          ...(bin_iin ? { bin_iin } : {}),
        });

      if (companyError) throw companyError;

      const { error: memberError } = await authedSupabase
        .from('company_members')
        .insert({
          company_id: companyId,
          user_id: user.id,
          role: 'owner' as AppRole,
        });

      if (memberError) throw memberError;

      // Return minimal object (full row will be fetched via companies query)
      return {
        id: companyId,
        name,
        address: null,
        bin_iin: bin_iin ?? null,
        created_at: null,
        default_currency: null,
        email: null,
        invoice_next_number: null,
        invoice_prefix: null,
        phone: null,
        tax_regime: null,
        is_vat_payer: null,
        kbe: null,
      } as Company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setCurrentCompanyId(company.id);
    },
  });

  const setCurrentCompany = (company: CompanyWithRole) => {
    setCurrentCompanyId(company.id);
  };

  const userRole = currentCompany?.role || null;
  const canEdit = userRole === 'owner' || userRole === 'accountant';
  const isOwner = userRole === 'owner';

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        isLoading,
        userRole,
        setCurrentCompany,
        createCompany: createCompanyMutation.mutateAsync,
        refetchCompanies,
        canEdit,
        isOwner,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
