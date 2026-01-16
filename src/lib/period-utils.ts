/**
 * Accounting Period Utilities
 * Single source of truth for period validation and detection
 */

import { supabase } from '@/integrations/supabase/client';
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

export interface PeriodValidationResult {
  isValid: boolean;
  periodId: string | null;
  periodName: string | null;
  status: 'open' | 'soft_closed' | 'hard_closed' | null;
  canWrite: boolean;
  error: string | null;
}

/**
 * Find the accounting period that covers a given date
 */
export async function findPeriodForDate(
  companyId: string,
  date: string | Date
): Promise<PeriodValidationResult> {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  
  const { data: period, error } = await supabase
    .from('accounting_periods')
    .select('id, name, status')
    .eq('company_id', companyId)
    .lte('start_date', dateStr)
    .gte('end_date', dateStr)
    .maybeSingle();

  if (error) {
    return {
      isValid: false,
      periodId: null,
      periodName: null,
      status: null,
      canWrite: false,
      error: `Ошибка поиска периода: ${error.message}`,
    };
  }

  if (!period) {
    return {
      isValid: false,
      periodId: null,
      periodName: null,
      status: null,
      canWrite: false,
      error: `Нет учётного периода для даты ${formatDateRu(dateStr)}. Создайте период в разделе "Периоды".`,
    };
  }

  const status = period.status as 'open' | 'soft_closed' | 'hard_closed';
  const canWrite = status === 'open';

  return {
    isValid: true,
    periodId: period.id,
    periodName: period.name,
    status,
    canWrite,
    error: canWrite ? null : `Период "${period.name}" ${getStatusMessage(status)}`,
  };
}

/**
 * Validate that a period allows writes
 */
export function canModifyPeriod(status: 'open' | 'soft_closed' | 'hard_closed' | string | null): {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  message: string;
  warning?: string;
} {
  switch (status) {
    case 'open':
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: 'Период открыт для всех операций',
      };
    case 'soft_closed':
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: 'Период закрыт (мягко). Изменения невозможны.',
        warning: 'Период закрыт. Откройте период для внесения изменений.',
      };
    case 'hard_closed':
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: 'Период закрыт окончательно. Изменения невозможны.',
        warning: 'Период закрыт окончательно. Изменения невозможны.',
      };
    default:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: 'Статус периода неизвестен',
        warning: 'Выберите корректный период',
      };
  }
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: 'open' | 'soft_closed' | 'hard_closed'): string {
  switch (status) {
    case 'open':
      return 'открыт';
    case 'soft_closed':
      return 'закрыт (мягко). Требуется открытие периода.';
    case 'hard_closed':
      return 'закрыт окончательно. Изменения невозможны.';
    default:
      return 'имеет неизвестный статус';
  }
}

/**
 * Format date in Russian locale
 */
function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get the current open period for a company
 */
export async function getCurrentOpenPeriod(companyId: string): Promise<AccountingPeriod | null> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as AccountingPeriod;
}

/**
 * Get all periods for a company that allow writes (open only)
 */
export async function getWritablePeriods(companyId: string): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false });

  if (error || !data) return [];
  return data as AccountingPeriod[];
}

/**
 * Check if any periods exist for a company
 */
export async function hasAnyPeriods(companyId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('accounting_periods')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) return false;
  return (count || 0) > 0;
}

/**
 * Auto-create periods for current year if none exist
 */
export async function ensurePeriodsExist(companyId: string): Promise<{
  created: boolean;
  count: number;
  error?: string;
}> {
  // Check if periods exist
  const exists = await hasAnyPeriods(companyId);
  if (exists) {
    return { created: false, count: 0 };
  }

  // Create periods for current year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const periodsToInsert = [];

  // Create periods from January to current month (current month is open)
  for (let month = 0; month <= currentMonth; month++) {
    const startDate = startOfMonth(new Date(currentYear, month, 1));
    const endDate = endOfMonth(startDate);
    
    periodsToInsert.push({
      company_id: companyId,
      name: `${monthNames[month]} ${currentYear}`,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      // Only current month is open (since we enforce single open period)
      status: month === currentMonth ? 'open' : 'soft_closed' as const,
      notes: 'Автоматически создан системой',
    });
  }

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert(periodsToInsert)
    .select();

  if (error) {
    return { created: false, count: 0, error: error.message };
  }

  return { created: true, count: data?.length || 0 };
}

/**
 * Validate period before creating/editing a record
 * Returns period_id if valid, throws error if not
 */
export async function validateAndGetPeriod(
  companyId: string,
  date: string | Date
): Promise<string> {
  const result = await findPeriodForDate(companyId, date);
  
  if (!result.isValid || !result.periodId) {
    throw new Error(result.error || 'Период не найден');
  }
  
  if (!result.canWrite) {
    throw new Error(result.error || 'Период закрыт для изменений');
  }
  
  return result.periodId;
}
