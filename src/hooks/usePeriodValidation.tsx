/**
 * Hook for period validation in forms
 * Provides real-time period status checking when date changes
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { findPeriodForDate, type PeriodValidationResult, ensurePeriodsExist } from '@/lib/period-utils';

export interface UsePeriodValidationOptions {
  autoEnsurePeriods?: boolean;
}

export function usePeriodValidation(
  date: string | Date | null,
  options: UsePeriodValidationOptions = {}
) {
  const { currentCompany } = useCompany();
  const { autoEnsurePeriods = true } = options;
  const [validation, setValidation] = useState<PeriodValidationResult>({
    isValid: false,
    periodId: null,
    periodName: null,
    status: null,
    canWrite: false,
    error: null,
  });
  const [isValidating, setIsValidating] = useState(false);

  // Fetch all periods for the company
  const { data: periods = [], isLoading: periodsLoading, refetch: refetchPeriods } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Auto-ensure periods exist
  useEffect(() => {
    const checkAndCreatePeriods = async () => {
      if (!currentCompany?.id || !autoEnsurePeriods || periodsLoading) return;
      
      if (periods.length === 0) {
        const result = await ensurePeriodsExist(currentCompany.id);
        if (result.created) {
          refetchPeriods();
        }
      }
    };
    
    checkAndCreatePeriods();
  }, [currentCompany?.id, periods.length, autoEnsurePeriods, periodsLoading, refetchPeriods]);

  // Validate period when date changes
  useEffect(() => {
    const validatePeriod = async () => {
      if (!currentCompany?.id || !date) {
        setValidation({
          isValid: false,
          periodId: null,
          periodName: null,
          status: null,
          canWrite: false,
          error: date ? 'Компания не выбрана' : null,
        });
        return;
      }

      setIsValidating(true);
      try {
        const result = await findPeriodForDate(currentCompany.id, date);
        setValidation(result);
      } catch (error: any) {
        setValidation({
          isValid: false,
          periodId: null,
          periodName: null,
          status: null,
          canWrite: false,
          error: error.message,
        });
      } finally {
        setIsValidating(false);
      }
    };

    validatePeriod();
  }, [currentCompany?.id, date]);

  // Get open periods for dropdown
  const openPeriods = periods.filter(p => p.status === 'open');
  const allNonClosedPeriods = periods.filter(p => p.status !== 'hard_closed');

  return {
    ...validation,
    isValidating: isValidating || periodsLoading,
    periods,
    openPeriods,
    allNonClosedPeriods,
    hasPeriods: periods.length > 0,
    refetchPeriods,
  };
}

/**
 * Simple hook to get periods for a company
 */
export function useAccountingPeriods() {
  const { currentCompany } = useCompany();

  const { data: periods = [], isLoading, refetch } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const openPeriods = periods.filter(p => p.status === 'open');
  const currentOpenPeriod = openPeriods[0] || null;

  return {
    periods,
    openPeriods,
    currentOpenPeriod,
    isLoading,
    refetch,
    hasPeriods: periods.length > 0,
  };
}
