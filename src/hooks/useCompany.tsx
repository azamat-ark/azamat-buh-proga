import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      if (!user) throw new Error('Требуется авторизация');

      const { name, bin_iin } = input;

      // Use secure RPC function to create company with owner membership atomically
      // This bypasses RLS via SECURITY DEFINER and ensures proper validation
      const { data: companyId, error } = await supabase.rpc('create_company_with_owner', {
        _company_name: name.trim(),
        _bin_iin: bin_iin?.trim() || null,
      });

      if (error) {
        // Translate common errors to Russian
        if (error.message.includes('Authentication required')) {
          throw new Error('Требуется авторизация');
        }
        if (error.message.includes('Company name is required')) {
          throw new Error('Название организации обязательно');
        }
        if (error.message.includes('BIN/IIN must be exactly 12 digits')) {
          throw new Error('БИН/ИИН должен содержать ровно 12 цифр');
        }
        throw error;
      }

      if (!companyId) {
        throw new Error('Не удалось создать организацию');
      }

      // Return minimal object (full row will be fetched via companies query)
      return {
        id: companyId,
        name: name.trim(),
        address: null,
        bin_iin: bin_iin?.trim() || null,
        created_at: null,
        default_currency: null,
        email: null,
        invoice_next_number: null,
        invoice_prefix: null,
        phone: null,
        tax_regime: null,
        is_vat_payer: null,
        kbe: null,
        fiscal_year_start: null,
        coa_standard: null,
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
