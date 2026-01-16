// Company initialization utilities
// Auto-populates essential data when a new company is created

import { supabase } from '@/integrations/supabase/client';
import { NSFO_TEMPLATE, flattenAccounts } from './chart-of-accounts-templates';
import { getDefaultTaxSettings, PAYROLL_ACCOUNT_MAPPING_TYPES } from './payroll-calculations';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths } from 'date-fns';

interface InitializationResult {
  chartOfAccountsCount: number;
  periodsCount: number;
  taxSettingsCreated: boolean;
  payrollMappingsCount: number;
  errors: string[];
}

/**
 * Initialize a new company with all essential data
 * Called automatically during onboarding or can be triggered manually
 */
export async function initializeCompanyData(companyId: string): Promise<InitializationResult> {
  const result: InitializationResult = {
    chartOfAccountsCount: 0,
    periodsCount: 0,
    taxSettingsCreated: false,
    payrollMappingsCount: 0,
    errors: [],
  };

  try {
    // 1. Populate Chart of Accounts
    const coaResult = await populateChartOfAccounts(companyId);
    result.chartOfAccountsCount = coaResult.count;
    if (coaResult.error) result.errors.push(coaResult.error);

    // 2. Create accounting periods for current year
    const periodsResult = await createAccountingPeriods(companyId);
    result.periodsCount = periodsResult.count;
    if (periodsResult.error) result.errors.push(periodsResult.error);

    // 3. Create tax settings for current year
    const taxResult = await createDefaultTaxSettings(companyId);
    result.taxSettingsCreated = taxResult.success;
    if (taxResult.error) result.errors.push(taxResult.error);

    // 4. Set up default payroll account mappings
    const mappingsResult = await createPayrollAccountMappings(companyId);
    result.payrollMappingsCount = mappingsResult.count;
    if (mappingsResult.error) result.errors.push(mappingsResult.error);

  } catch (error: any) {
    result.errors.push(`Общая ошибка: ${error.message}`);
  }

  return result;
}

/**
 * Populate the chart of accounts with Kazakhstan NSFO template
 */
async function populateChartOfAccounts(companyId: string): Promise<{ count: number; error?: string }> {
  try {
    // Check if COA already exists
    const { count: existingCount } = await supabase
      .from('chart_of_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (existingCount && existingCount > 0) {
      return { count: existingCount, error: undefined };
    }

    // Flatten the template
    const flatAccounts = flattenAccounts(NSFO_TEMPLATE);
    
    // First pass: Insert all accounts with parent_code (we'll link parent_id after)
    const accountsToInsert = flatAccounts.map(account => ({
      company_id: companyId,
      code: account.code,
      name: account.name,
      name_kz: account.name_kz,
      account_class: account.account_class,
      is_system: account.is_system,
      allow_manual_entry: account.allow_manual_entry,
      is_active: true,
    }));

    const { data: insertedAccounts, error: insertError } = await supabase
      .from('chart_of_accounts')
      .insert(accountsToInsert)
      .select('id, code');

    if (insertError) {
      return { count: 0, error: `План счетов: ${insertError.message}` };
    }

    // Second pass: Update parent_id references
    const codeToId = new Map(insertedAccounts?.map(a => [a.code, a.id]) || []);
    
    const updates = flatAccounts
      .filter(a => a.parent_code)
      .map(a => ({
        code: a.code,
        parent_id: codeToId.get(a.parent_code!) || null,
      }))
      .filter(u => u.parent_id);

    for (const update of updates) {
      await supabase
        .from('chart_of_accounts')
        .update({ parent_id: update.parent_id })
        .eq('company_id', companyId)
        .eq('code', update.code);
    }

    return { count: insertedAccounts?.length || 0 };
  } catch (error: any) {
    return { count: 0, error: `План счетов: ${error.message}` };
  }
}

/**
 * Create accounting periods for the current year
 */
async function createAccountingPeriods(companyId: string): Promise<{ count: number; error?: string }> {
  try {
    // Check if periods already exist
    const { count: existingCount } = await supabase
      .from('accounting_periods')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (existingCount && existingCount > 0) {
      return { count: existingCount };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const periodsToInsert = [];

    // Create periods from January to current month
    // ONLY current month is 'open', all previous months are 'soft_closed'
    // This enforces the single open period rule at the DB level
    for (let month = 0; month <= currentMonth; month++) {
      const startDate = startOfMonth(new Date(currentYear, month, 1));
      const endDate = endOfMonth(startDate);
      
      periodsToInsert.push({
        company_id: companyId,
        name: `${monthNames[month]} ${currentYear}`,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        // Only current month is open (enforces single open period DB trigger)
        status: month === currentMonth ? 'open' : 'soft_closed' as const,
        notes: 'Автоматически создан при регистрации',
      });
    }

    const { data: insertedPeriods, error } = await supabase
      .from('accounting_periods')
      .insert(periodsToInsert)
      .select();

    if (error) {
      return { count: 0, error: `Периоды: ${error.message}` };
    }

    return { count: insertedPeriods?.length || 0 };
  } catch (error: any) {
    return { count: 0, error: `Периоды: ${error.message}` };
  }
}

/**
 * Create default tax settings for current year
 */
async function createDefaultTaxSettings(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentYear = new Date().getFullYear();

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('tax_settings')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', currentYear)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const defaults = getDefaultTaxSettings(currentYear);

    const { error } = await supabase
      .from('tax_settings')
      .insert({
        company_id: companyId,
        year: currentYear,
        mrp: defaults.mrp,
        mzp: defaults.mzp,
        opv_rate: defaults.opv_rate,
        opv_cap_mzp: defaults.opv_cap_mzp,
        vosms_employee_rate: defaults.vosms_employee_rate,
        vosms_employer_rate: defaults.vosms_employer_rate,
        social_tax_rate: defaults.social_tax_rate,
        social_contrib_rate: defaults.social_contrib_rate,
        social_contrib_min_mzp: defaults.social_contrib_min_mzp,
        social_contrib_max_mzp: defaults.social_contrib_max_mzp,
        ipn_resident_rate: defaults.ipn_resident_rate,
        ipn_nonresident_rate: defaults.ipn_nonresident_rate,
        standard_deduction_mrp: defaults.standard_deduction_mrp,
      });

    if (error) {
      return { success: false, error: `Налоговые ставки: ${error.message}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Налоговые ставки: ${error.message}` };
  }
}

/**
 * Create default payroll account mappings based on chart of accounts
 */
async function createPayrollAccountMappings(companyId: string): Promise<{ count: number; error?: string }> {
  try {
    // Check if mappings already exist
    const { count: existingCount } = await supabase
      .from('payroll_account_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (existingCount && existingCount > 0) {
      return { count: existingCount };
    }

    // Get chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_class')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (!accounts || accounts.length === 0) {
      return { count: 0, error: 'Нет плана счетов для привязки' };
    }

    // Map account codes to payroll types
    const accountCodeMappings: Record<string, string> = {
      // Salary expense -> 7210 Административные расходы
      [PAYROLL_ACCOUNT_MAPPING_TYPES.SALARY_EXPENSE]: '7210',
      // Salary payable -> 3350 Краткосрочная задолженность по оплате труда
      [PAYROLL_ACCOUNT_MAPPING_TYPES.SALARY_PAYABLE]: '3350',
      // OPV payable -> 3360 Краткосрочные отчисления в пенсионный фонд
      [PAYROLL_ACCOUNT_MAPPING_TYPES.OPV_PAYABLE]: '3360',
      // IPN payable -> 3120 ИПН к уплате
      [PAYROLL_ACCOUNT_MAPPING_TYPES.IPN_PAYABLE]: '3120',
      // Social tax payable -> 3140 Социальный налог к уплате
      [PAYROLL_ACCOUNT_MAPPING_TYPES.SOCIAL_TAX_PAYABLE]: '3140',
      // Social contributions payable -> 3370 Краткосрочные отчисления в фонд СС
      [PAYROLL_ACCOUNT_MAPPING_TYPES.SOCIAL_CONTRIB_PAYABLE]: '3370',
      // VOSMS payable -> 3380 Краткосрочные отчисления ОСМС
      [PAYROLL_ACCOUNT_MAPPING_TYPES.VOSMS_PAYABLE]: '3380',
    };

    const mappingsToInsert = [];

    for (const [mappingType, accountCode] of Object.entries(accountCodeMappings)) {
      const account = accounts.find(a => a.code === accountCode);
      if (account) {
        mappingsToInsert.push({
          company_id: companyId,
          mapping_type: mappingType,
          account_id: account.id,
        });
      }
    }

    if (mappingsToInsert.length === 0) {
      return { count: 0, error: 'Не найдены соответствующие счета' };
    }

    const { data: inserted, error } = await supabase
      .from('payroll_account_mappings')
      .insert(mappingsToInsert)
      .select();

    if (error) {
      return { count: 0, error: `Привязка счетов: ${error.message}` };
    }

    return { count: inserted?.length || 0 };
  } catch (error: any) {
    return { count: 0, error: `Привязка счетов: ${error.message}` };
  }
}

/**
 * Check if company has essential data configured
 */
export async function checkCompanyConfiguration(companyId: string): Promise<{
  hasChartOfAccounts: boolean;
  hasAccountingPeriods: boolean;
  hasTaxSettings: boolean;
  hasPayrollMappings: boolean;
  isFullyConfigured: boolean;
}> {
  const [coaResult, periodsResult, taxResult, mappingsResult] = await Promise.all([
    supabase.from('chart_of_accounts').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('accounting_periods').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('tax_settings').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('payroll_account_mappings').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  const hasChartOfAccounts = (coaResult.count || 0) > 0;
  const hasAccountingPeriods = (periodsResult.count || 0) > 0;
  const hasTaxSettings = (taxResult.count || 0) > 0;
  const hasPayrollMappings = (mappingsResult.count || 0) >= 7; // Need all 7 mappings

  return {
    hasChartOfAccounts,
    hasAccountingPeriods,
    hasTaxSettings,
    hasPayrollMappings,
    isFullyConfigured: hasChartOfAccounts && hasAccountingPeriods && hasTaxSettings && hasPayrollMappings,
  };
}
