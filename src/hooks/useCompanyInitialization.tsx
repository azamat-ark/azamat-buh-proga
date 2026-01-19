/**
 * Company Initialization Hook
 * - Ensures companies have essential data (chart of accounts, periods, tax settings)
 * - Runs automatically when a company is loaded
 * - Prevents "empty data" issues for companies created before initialization logic existed
 */

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompany';
import { 
  initializeCompanyData, 
  checkCompanyConfiguration 
} from '@/lib/company-initialization';
import { useToast } from '@/hooks/use-toast';

interface InitializationStatus {
  isChecking: boolean;
  isInitializing: boolean;
  isComplete: boolean;
  hasChartOfAccounts: boolean;
  hasAccountingPeriods: boolean;
  hasTaxSettings: boolean;
  hasPayrollMappings: boolean;
  error: string | null;
}

/**
 * Hook that auto-initializes company data when missing
 * Safe to call multiple times - only runs once per company
 */
export function useCompanyInitialization() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initializingRef = useRef<string | null>(null);

  const [status, setStatus] = useState<InitializationStatus>({
    isChecking: true,
    isInitializing: false,
    isComplete: false,
    hasChartOfAccounts: false,
    hasAccountingPeriods: false,
    hasTaxSettings: false,
    hasPayrollMappings: false,
    error: null,
  });

  useEffect(() => {
    const checkAndInitialize = async () => {
      if (!currentCompany?.id) {
        setStatus(prev => ({ ...prev, isChecking: false }));
        return;
      }

      // Prevent duplicate initialization for the same company
      if (initializingRef.current === currentCompany.id) {
        return;
      }

      setStatus(prev => ({ ...prev, isChecking: true, error: null }));

      try {
        // Check current configuration
        const config = await checkCompanyConfiguration(currentCompany.id);

        setStatus(prev => ({
          ...prev,
          hasChartOfAccounts: config.hasChartOfAccounts,
          hasAccountingPeriods: config.hasAccountingPeriods,
          hasTaxSettings: config.hasTaxSettings,
          hasPayrollMappings: config.hasPayrollMappings,
        }));

        // If fully configured, mark as complete
        if (config.isFullyConfigured) {
          setStatus(prev => ({ 
            ...prev, 
            isChecking: false, 
            isComplete: true 
          }));
          return;
        }

        // Need to initialize missing data
        initializingRef.current = currentCompany.id;
        setStatus(prev => ({ ...prev, isChecking: false, isInitializing: true }));

        console.log(`Initializing company ${currentCompany.id} - missing essential data`);
        const result = await initializeCompanyData(currentCompany.id);

        if (result.errors.length > 0) {
          console.warn('Company initialization warnings:', result.errors);
          // Don't show toast for partial success - data may still be usable
        }

        // Invalidate all relevant queries to refresh data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['accounting-periods'] }),
          queryClient.invalidateQueries({ queryKey: ['tax-settings'] }),
          queryClient.invalidateQueries({ queryKey: ['payroll-account-mappings'] }),
        ]);

        // Re-check configuration after initialization
        const newConfig = await checkCompanyConfiguration(currentCompany.id);

        setStatus({
          isChecking: false,
          isInitializing: false,
          isComplete: true,
          hasChartOfAccounts: newConfig.hasChartOfAccounts,
          hasAccountingPeriods: newConfig.hasAccountingPeriods,
          hasTaxSettings: newConfig.hasTaxSettings,
          hasPayrollMappings: newConfig.hasPayrollMappings,
          error: null,
        });

        // Show success notification if we initialized data
        if (result.chartOfAccountsCount > 0 || result.periodsCount > 0) {
          toast({
            title: 'Данные настроены',
            description: `План счетов: ${result.chartOfAccountsCount} счетов, Периоды: ${result.periodsCount}`,
          });
        }

      } catch (error: any) {
        console.error('Company initialization error:', error);
        setStatus(prev => ({
          ...prev,
          isChecking: false,
          isInitializing: false,
          error: error.message,
        }));
      } finally {
        initializingRef.current = null;
      }
    };

    checkAndInitialize();
  }, [currentCompany?.id, queryClient, toast]);

  return status;
}

/**
 * Lightweight version that just ensures periods exist
 * Use when you don't need full company initialization
 */
export { useEnsurePeriods } from './usePeriodsManager';
