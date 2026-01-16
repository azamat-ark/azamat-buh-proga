/**
 * Global Periods Manager Hook
 * - Auto-creates periods on company load
 * - Provides shared period selection with URL + localStorage persistence
 * - Single source of truth for period state across the app
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface AccountingPeriod {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'soft_closed' | 'hard_closed';
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

/**
 * Get localStorage key for persisted period selection
 */
function getStorageKey(companyId: string): string {
  return `selected_period_${companyId}`;
}

/**
 * Auto-create periods for the current year if none exist
 * IMPORTANT: Only current month is 'open', all others are 'soft_closed'
 */
async function autoCreatePeriods(companyId: string): Promise<{ created: boolean; count: number; error?: string }> {
  // Check if periods already exist
  const { count: existingCount, error: countError } = await supabase
    .from('accounting_periods')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (countError) {
    console.error('Error checking periods:', countError);
    return { created: false, count: 0, error: countError.message };
  }

  if (existingCount && existingCount > 0) {
    return { created: false, count: existingCount };
  }

  // Create periods for current year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const periodsToInsert = [];

  // Create periods from January to current month
  // ONLY current month is 'open', all previous months are 'soft_closed'
  for (let month = 0; month <= currentMonth; month++) {
    const startDate = startOfMonth(new Date(currentYear, month, 1));
    const endDate = endOfMonth(startDate);

    periodsToInsert.push({
      company_id: companyId,
      name: `${MONTH_NAMES[month]} ${currentYear}`,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      // Only current month is open (enforces single open period rule)
      status: month === currentMonth ? 'open' : 'soft_closed',
      notes: 'Автоматически создан системой',
    });
  }

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert(periodsToInsert)
    .select();

  if (error) {
    console.error('Error creating periods:', error);
    return { created: false, count: 0, error: error.message };
  }

  console.log(`Auto-created ${data?.length || 0} periods for company ${companyId}`);
  return { created: true, count: data?.length || 0 };
}

/**
 * Main hook for managing periods across the app
 */
export function usePeriodsManager() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch all periods for the company
  const {
    data: periods = [],
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) {
        console.error('Error fetching periods:', error);
        throw error;
      }
      return data as AccountingPeriod[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Auto-create periods if none exist
  useEffect(() => {
    const ensurePeriods = async () => {
      if (!currentCompany?.id || isLoading) return;
      
      if (periods.length === 0) {
        const result = await autoCreatePeriods(currentCompany.id);
        if (result.created && result.count > 0) {
          // Refetch periods after creation
          refetch();
        }
      }
    };

    ensurePeriods();
  }, [currentCompany?.id, periods.length, isLoading, refetch]);

  // Get current open period
  const currentOpenPeriod = useMemo(() => {
    return periods.find(p => p.status === 'open') || null;
  }, [periods]);

  // Determine selected period from URL > localStorage > current open period
  const selectedPeriodId = useMemo(() => {
    // 1. Check URL param first
    const urlPeriodId = searchParams.get('period_id');
    if (urlPeriodId && periods.some(p => p.id === urlPeriodId)) {
      return urlPeriodId;
    }

    // 2. Check localStorage
    if (currentCompany?.id) {
      const storedId = localStorage.getItem(getStorageKey(currentCompany.id));
      if (storedId && periods.some(p => p.id === storedId)) {
        return storedId;
      }
    }

    // 3. Default to current open period
    return currentOpenPeriod?.id || null;
  }, [searchParams, periods, currentCompany?.id, currentOpenPeriod]);

  // Get full selected period object
  const selectedPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  // Set selected period (updates URL + localStorage)
  const setSelectedPeriodId = useCallback((periodId: string) => {
    if (!currentCompany?.id) return;

    // Update URL
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('period_id', periodId);
      return next;
    }, { replace: true });

    // Update localStorage
    localStorage.setItem(getStorageKey(currentCompany.id), periodId);
  }, [currentCompany?.id, setSearchParams]);

  // Sync URL with localStorage on mount (if URL is missing but localStorage has value)
  useEffect(() => {
    if (!currentCompany?.id || isLoading || periods.length === 0) return;

    const urlPeriodId = searchParams.get('period_id');
    if (!urlPeriodId && selectedPeriodId) {
      // Set URL from determined selection
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('period_id', selectedPeriodId);
        return next;
      }, { replace: true });
    }
  }, [currentCompany?.id, isLoading, periods.length, selectedPeriodId, searchParams, setSearchParams]);

  // Check if selected period allows writes
  const canWrite = useMemo(() => {
    return selectedPeriod?.status === 'open';
  }, [selectedPeriod]);

  // Get error message if period is closed
  const writeBlockedMessage = useMemo(() => {
    if (!selectedPeriod) return 'Период не выбран';
    if (selectedPeriod.status === 'soft_closed') {
      return `Период "${selectedPeriod.name}" закрыт (мягко). Изменения невозможны.`;
    }
    if (selectedPeriod.status === 'hard_closed') {
      return `Период "${selectedPeriod.name}" закрыт окончательно. Изменения невозможны.`;
    }
    return null;
  }, [selectedPeriod]);

  return {
    // Data
    periods,
    selectedPeriodId,
    selectedPeriod,
    currentOpenPeriod,
    
    // State
    isLoading,
    hasPeriods: periods.length > 0,
    canWrite,
    writeBlockedMessage,
    
    // Actions
    setSelectedPeriodId,
    refetch,
    
    // Error
    error: fetchError,
  };
}

/**
 * Lightweight hook just for checking if periods exist and auto-creating
 * Use this in places where you don't need full period management
 */
export function useEnsurePeriods() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ensure = async () => {
      if (!currentCompany?.id) return;
      
      // Check if periods exist
      const { count } = await supabase
        .from('accounting_periods')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id);
      
      if (count === 0) {
        const result = await autoCreatePeriods(currentCompany.id);
        if (result.created) {
          // Invalidate queries so other components see the new periods
          queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
        }
      }
    };

    ensure();
  }, [currentCompany?.id, queryClient]);
}
