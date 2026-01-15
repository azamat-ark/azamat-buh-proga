/**
 * Accounting Utilities for Trial Balance, Balance Sheet, and Financial Reports
 */

// ==========================================
// TYPE EXPORTS FOR PAGES
// ==========================================

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  account_class: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  is_current?: boolean;
  balance_sheet_group?: string;
  pl_group?: string;
}

export interface JournalLine {
  account_id: string;
  debit: number;
  credit: number;
}

export interface OpeningBalance {
  account_id: string;
  opening_debit: number;
  opening_credit: number;
}

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  accountClass: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isCurrent?: boolean;
  openingDebit: number;
  openingCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceData {
  accounts: AccountBalance[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    turnoverDebit: number;
    turnoverCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
  isBalanced: boolean;
}

export interface BalanceSheetSection {
  title: string;
  accounts: AccountBalance[];
  total: number;
}

export interface BalanceSheetData {
  assets: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    total: number;
  };
  liabilities: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    total: number;
  };
  equity: {
    items: AccountBalance[];
    total: number;
  };
  // Computed sections for rendering
  currentAssets: BalanceSheetSection;
  nonCurrentAssets: BalanceSheetSection;
  totalAssets: number;
  currentLiabilities: BalanceSheetSection;
  nonCurrentLiabilities: BalanceSheetSection;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface ProfitLossSection {
  accounts: AccountBalance[];
  total: number;
}

export interface ProfitLossData {
  revenue: ProfitLossSection;
  expenses: ProfitLossSection;
  netProfit: number;
  netIncome: number; // Alias for netProfit
}

export interface CounterpartyBalance {
  counterpartyId: string;
  name: string;
  openingBalance: number;
  debits: number;
  credits: number;
  closingBalance: number;
  type: 'receivable' | 'payable';
}

export interface PayrollAccountMappings {
  salary_expense?: string;
  salary_payable?: string;
  opv_payable?: string;
  vosms_payable?: string;
  ipn_payable?: string;
  social_tax_payable?: string;
  social_contrib_payable?: string;
  [key: string]: string | undefined;
}

export interface PayrollJournalLine {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

export interface PayrollJournalData {
  grossSalary: number;
  opv: number;
  vosmsEmployee: number;
  ipn: number;
  netSalary: number;
  socialTax: number;
  socialContributions: number;
  vosmsEmployer: number;
}

/**
 * Format amount in KZT
 */
export function formatKZT(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate trial balance from journal entries
 */
export function calculateTrialBalance(
  accounts: ChartAccount[],
  journalLines: JournalLine[],
  openingBalances: Map<string, { debit: number; credit: number }> | OpeningBalance[]
): TrialBalanceData {
  const balanceMap = new Map<string, AccountBalance>();
  
  // Convert array to map if needed
  const openingsMap = openingBalances instanceof Map
    ? openingBalances
    : new Map(
        (openingBalances as OpeningBalance[]).map(ob => [
          ob.account_id,
          { debit: ob.opening_debit || 0, credit: ob.opening_credit || 0 }
        ])
      );
  
  // Initialize accounts
  accounts.forEach(acc => {
    const opening = openingsMap.get(acc.id) || { debit: 0, credit: 0 };
    balanceMap.set(acc.id, {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      accountClass: acc.account_class as AccountBalance['accountClass'],
      isCurrent: acc.is_current,
      openingDebit: opening.debit,
      openingCredit: opening.credit,
      turnoverDebit: 0,
      turnoverCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    });
  });
  
  // Accumulate turnovers from journal lines
  journalLines.forEach(line => {
    const balance = balanceMap.get(line.account_id);
    if (balance) {
      balance.turnoverDebit += Number(line.debit) || 0;
      balance.turnoverCredit += Number(line.credit) || 0;
    }
  });
  
  // Calculate closing balances
  balanceMap.forEach(balance => {
    const debitSide = balance.openingDebit + balance.turnoverDebit;
    const creditSide = balance.openingCredit + balance.turnoverCredit;
    
    // For asset/expense accounts, debit balance is normal
    // For liability/equity/revenue accounts, credit balance is normal
    if (['asset', 'expense'].includes(balance.accountClass)) {
      if (debitSide >= creditSide) {
        balance.closingDebit = debitSide - creditSide;
        balance.closingCredit = 0;
      } else {
        balance.closingDebit = 0;
        balance.closingCredit = creditSide - debitSide;
      }
    } else {
      if (creditSide >= debitSide) {
        balance.closingCredit = creditSide - debitSide;
        balance.closingDebit = 0;
      } else {
        balance.closingCredit = 0;
        balance.closingDebit = debitSide - creditSide;
      }
    }
  });
  
  const accountsList = Array.from(balanceMap.values())
    .filter(b => 
      b.openingDebit > 0 || b.openingCredit > 0 || 
      b.turnoverDebit > 0 || b.turnoverCredit > 0
    )
    .sort((a, b) => a.code.localeCompare(b.code));
  
  const totals = accountsList.reduce(
    (acc, b) => ({
      openingDebit: acc.openingDebit + b.openingDebit,
      openingCredit: acc.openingCredit + b.openingCredit,
      turnoverDebit: acc.turnoverDebit + b.turnoverDebit,
      turnoverCredit: acc.turnoverCredit + b.turnoverCredit,
      closingDebit: acc.closingDebit + b.closingDebit,
      closingCredit: acc.closingCredit + b.closingCredit,
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      turnoverDebit: 0,
      turnoverCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    }
  );
  
  return {
    accounts: accountsList,
    totals,
    isBalanced: 
      Math.abs(totals.openingDebit - totals.openingCredit) < 0.01 &&
      Math.abs(totals.closingDebit - totals.closingCredit) < 0.01,
  };
}

/**
 * Build balance sheet from trial balance
 * Uses is_current flag if available, otherwise falls back to code-based heuristics
 */
export function buildBalanceSheet(trialBalance: TrialBalanceData): BalanceSheetData {
  const assets = trialBalance.accounts.filter(a => a.accountClass === 'asset');
  const liabilities = trialBalance.accounts.filter(a => a.accountClass === 'liability');
  const equity = trialBalance.accounts.filter(a => a.accountClass === 'equity');
  
  // Use is_current flag if available, otherwise use code-based classification
  const currentAssets = assets.filter(a => 
    a.isCurrent !== undefined ? a.isCurrent : a.code < '2000'
  );
  const nonCurrentAssets = assets.filter(a => 
    a.isCurrent !== undefined ? !a.isCurrent : a.code >= '2000'
  );
  const currentLiabilities = liabilities.filter(a => 
    a.isCurrent !== undefined ? a.isCurrent : a.code < '4000'
  );
  const nonCurrentLiabilities = liabilities.filter(a => 
    a.isCurrent !== undefined ? !a.isCurrent : a.code >= '4000'
  );
  
  const getBalance = (acc: AccountBalance) => 
    acc.closingDebit - acc.closingCredit;
  
  const getLiabilityBalance = (acc: AccountBalance) => 
    acc.closingCredit - acc.closingDebit;
  
  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + getBalance(a), 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + getBalance(a), 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
  
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + getLiabilityBalance(a), 0);
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + getLiabilityBalance(a), 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
  const totalEquity = equity.reduce((sum, a) => sum + getLiabilityBalance(a), 0);
  
  return {
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      total: totalLiabilities,
    },
    equity: {
      items: equity,
      total: totalEquity,
    },
    // Computed sections for rendering
    currentAssets: {
      title: 'Оборотные активы',
      accounts: currentAssets,
      total: totalCurrentAssets,
    },
    nonCurrentAssets: {
      title: 'Внеоборотные активы',
      accounts: nonCurrentAssets,
      total: totalNonCurrentAssets,
    },
    totalAssets,
    currentLiabilities: {
      title: 'Краткосрочные обязательства',
      accounts: currentLiabilities,
      total: totalCurrentLiabilities,
    },
    nonCurrentLiabilities: {
      title: 'Долгосрочные обязательства',
      accounts: nonCurrentLiabilities,
      total: totalNonCurrentLiabilities,
    },
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
  };
}

/**
 * Build profit and loss statement from trial balance
 */
export function buildProfitLoss(trialBalance: TrialBalanceData): ProfitLossData {
  const revenue = trialBalance.accounts.filter(a => a.accountClass === 'revenue');
  const expenses = trialBalance.accounts.filter(a => a.accountClass === 'expense');
  
  // Revenue has credit balance (turnover credit - turnover debit)
  const totalRevenue = revenue.reduce((sum, a) => 
    sum + a.turnoverCredit - a.turnoverDebit, 0);
  
  // Expenses have debit balance (turnover debit - turnover credit)
  const totalExpenses = expenses.reduce((sum, a) => 
    sum + a.turnoverDebit - a.turnoverCredit, 0);
  
  const netProfit = totalRevenue - totalExpenses;
  
  return {
    revenue: {
      accounts: revenue,
      total: totalRevenue,
    },
    expenses: {
      accounts: expenses,
      total: totalExpenses,
    },
    netProfit,
    netIncome: netProfit, // Alias
  };
}

/**
 * Validate journal entry balance
 */
export function validateJournalEntryBalance(
  lines: Array<{ debit: number; credit: number }>
): { isValid: boolean; difference: number; message: string } {
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  
  if (difference < 0.01) {
    return { isValid: true, difference: 0, message: 'Проводка сбалансирована' };
  }
  
  return {
    isValid: false,
    difference,
    message: `Дебет (${totalDebit.toFixed(2)}) ≠ Кредит (${totalCredit.toFixed(2)}). Разница: ${difference.toFixed(2)}`,
  };
}

/**
 * Generate journal entry lines for payroll
 */
export function generatePayrollJournalEntries(
  payrollData: PayrollJournalData,
  accountCodes: {
    salaryExpense: string;
    salaryPayable: string;
    opvPayable: string;
    vosmsPayable: string;
    ipnPayable: string;
    socialTaxPayable: string;
    socialContribPayable: string;
  }
): Array<{ accountCode: string; debit: number; credit: number; description: string }> {
  const entries: Array<{ accountCode: string; debit: number; credit: number; description: string }> = [];
  
  // Debit: Salary Expense (total employer cost)
  const totalEmployerCost = payrollData.grossSalary + payrollData.socialTax + 
    payrollData.socialContributions + payrollData.vosmsEmployer;
  
  entries.push({
    accountCode: accountCodes.salaryExpense,
    debit: totalEmployerCost,
    credit: 0,
    description: 'Начисление заработной платы',
  });
  
  // Credit: Net Salary Payable
  entries.push({
    accountCode: accountCodes.salaryPayable,
    debit: 0,
    credit: payrollData.netSalary,
    description: 'Задолженность по зарплате',
  });
  
  // Credit: OPV Payable
  if (payrollData.opv > 0) {
    entries.push({
      accountCode: accountCodes.opvPayable,
      debit: 0,
      credit: payrollData.opv,
      description: 'ОПВ к уплате',
    });
  }
  
  // Credit: VOSMS (Employee + Employer)
  const totalVosms = payrollData.vosmsEmployee + payrollData.vosmsEmployer;
  if (totalVosms > 0) {
    entries.push({
      accountCode: accountCodes.vosmsPayable,
      debit: 0,
      credit: totalVosms,
      description: 'ВОСМС к уплате',
    });
  }
  
  // Credit: IPN Payable
  if (payrollData.ipn > 0) {
    entries.push({
      accountCode: accountCodes.ipnPayable,
      debit: 0,
      credit: payrollData.ipn,
      description: 'ИПН к уплате',
    });
  }
  
  // Credit: Social Tax Payable
  if (payrollData.socialTax > 0) {
    entries.push({
      accountCode: accountCodes.socialTaxPayable,
      debit: 0,
      credit: payrollData.socialTax,
      description: 'Социальный налог к уплате',
    });
  }
  
  // Credit: Social Contributions Payable
  if (payrollData.socialContributions > 0) {
    entries.push({
      accountCode: accountCodes.socialContribPayable,
      debit: 0,
      credit: payrollData.socialContributions,
      description: 'Социальные отчисления к уплате',
    });
  }
  
  return entries;
}

/**
 * Generate journal lines for payroll using account ID mappings
 */
export function generatePayrollJournalLines(
  payrollData: PayrollJournalData,
  accountMappings: PayrollAccountMappings
): { lines: PayrollJournalLine[]; errors: string[] } {
  const lines: PayrollJournalLine[] = [];
  const errors: string[] = [];
  
  // Validate mappings
  const requiredMappings = [
    { key: 'salary_expense', label: 'Расходы на зарплату' },
    { key: 'salary_payable', label: 'Задолженность по зарплате' },
    { key: 'opv_payable', label: 'ОПВ к уплате' },
    { key: 'vosms_payable', label: 'ВОСМС к уплате' },
    { key: 'ipn_payable', label: 'ИПН к уплате' },
    { key: 'social_tax_payable', label: 'Соц. налог к уплате' },
    { key: 'social_contrib_payable', label: 'Соц. отчисления к уплате' },
  ];
  
  for (const { key, label } of requiredMappings) {
    if (!accountMappings[key]) {
      errors.push(`Не настроен счёт: ${label}`);
    }
  }
  
  if (errors.length > 0) {
    return { lines, errors };
  }
  
  // Total employer cost for debit
  const totalEmployerCost = payrollData.grossSalary + payrollData.socialTax + 
    payrollData.socialContributions + payrollData.vosmsEmployer;
  
  // Debit: Salary Expense
  lines.push({
    account_id: accountMappings.salary_expense!,
    debit: totalEmployerCost,
    credit: 0,
    description: 'Начисление ЗП',
  });
  
  // Credit: Net Salary Payable
  lines.push({
    account_id: accountMappings.salary_payable!,
    debit: 0,
    credit: payrollData.netSalary,
    description: 'Задолженность по ЗП',
  });
  
  // Credit: OPV Payable
  if (payrollData.opv > 0) {
    lines.push({
      account_id: accountMappings.opv_payable!,
      debit: 0,
      credit: payrollData.opv,
      description: 'ОПВ к уплате',
    });
  }
  
  // Credit: VOSMS (Employee + Employer)
  const totalVosms = payrollData.vosmsEmployee + payrollData.vosmsEmployer;
  if (totalVosms > 0) {
    lines.push({
      account_id: accountMappings.vosms_payable!,
      debit: 0,
      credit: totalVosms,
      description: 'ВОСМС к уплате',
    });
  }
  
  // Credit: IPN Payable
  if (payrollData.ipn > 0) {
    lines.push({
      account_id: accountMappings.ipn_payable!,
      debit: 0,
      credit: payrollData.ipn,
      description: 'ИПН к уплате',
    });
  }
  
  // Credit: Social Tax Payable
  if (payrollData.socialTax > 0) {
    lines.push({
      account_id: accountMappings.social_tax_payable!,
      debit: 0,
      credit: payrollData.socialTax,
      description: 'Соц. налог',
    });
  }
  
  // Credit: Social Contributions Payable
  if (payrollData.socialContributions > 0) {
    lines.push({
      account_id: accountMappings.social_contrib_payable!,
      debit: 0,
      credit: payrollData.socialContributions,
      description: 'Соц. отчисления',
    });
  }
  
  // Validate balance
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(`Проводка не сбалансирована: Дт ${totalDebit} ≠ Кт ${totalCredit}`);
  }
  
  return { lines, errors };
}

/**
 * Check if accounting period allows modifications
 */
export function canModifyPeriod(status: 'open' | 'soft_closed' | 'hard_closed' | string): {
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
        message: 'Период закрыт (мягко). Требуется переоткрытие для изменений.',
        warning: 'Период закрыт. Переоткройте период для внесения изменений.',
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
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: 'Статус периода не определён',
      };
  }
}

/**
 * Get last day of month for a given YYYY-MM period string
 */
export function getLastDayOfMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${period}-${String(lastDay).padStart(2, '0')}`;
}
