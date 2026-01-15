/**
 * Accounting Utilities for Trial Balance, Balance Sheet, and Financial Reports
 */

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  accountClass: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
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
  isBalanced: boolean;
}

export interface ProfitLossData {
  revenue: {
    items: AccountBalance[];
    total: number;
  };
  expenses: {
    items: AccountBalance[];
    total: number;
  };
  netProfit: number;
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

/**
 * Calculate trial balance from journal entries
 */
export function calculateTrialBalance(
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    account_class: string;
  }>,
  journalLines: Array<{
    account_id: string;
    debit: number;
    credit: number;
  }>,
  openingBalances: Map<string, { debit: number; credit: number }>
): TrialBalanceData {
  const balanceMap = new Map<string, AccountBalance>();
  
  // Initialize accounts
  accounts.forEach(acc => {
    const opening = openingBalances.get(acc.id) || { debit: 0, credit: 0 };
    balanceMap.set(acc.id, {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      accountClass: acc.account_class as AccountBalance['accountClass'],
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
 */
export function buildBalanceSheet(trialBalance: TrialBalanceData): BalanceSheetData {
  const assets = trialBalance.accounts.filter(a => a.accountClass === 'asset');
  const liabilities = trialBalance.accounts.filter(a => a.accountClass === 'liability');
  const equity = trialBalance.accounts.filter(a => a.accountClass === 'equity');
  
  // Simplified: treat accounts with code < 2000 as current
  const currentAssets = assets.filter(a => a.code < '2000');
  const nonCurrentAssets = assets.filter(a => a.code >= '2000');
  const currentLiabilities = liabilities.filter(a => a.code < '4000');
  const nonCurrentLiabilities = liabilities.filter(a => a.code >= '4000');
  
  const getBalance = (acc: AccountBalance) => 
    acc.closingDebit - acc.closingCredit;
  
  const totalAssets = assets.reduce((sum, a) => sum + getBalance(a), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum - getBalance(a), 0);
  const totalEquity = equity.reduce((sum, a) => sum - getBalance(a), 0);
  
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
  
  return {
    revenue: {
      items: revenue,
      total: totalRevenue,
    },
    expenses: {
      items: expenses,
      total: totalExpenses,
    },
    netProfit: totalRevenue - totalExpenses,
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
 * Generate journal entries for payroll
 */
export function generatePayrollJournalEntries(
  payrollData: {
    grossSalary: number;
    opv: number;
    vosmsEmployee: number;
    ipn: number;
    netSalary: number;
    socialTax: number;
    socialContributions: number;
    vosmsEmployer: number;
  },
  accountCodes: {
    salaryExpense: string; // 7210 - Administrative expenses
    salaryPayable: string; // 3350 - Salary payable
    opvPayable: string; // 3360 - Pension contributions
    vosmsPayable: string; // 3380 - VOSMS
    ipnPayable: string; // 3120 - IPN payable
    socialTaxPayable: string; // 3140 - Social tax
    socialContribPayable: string; // 3370 - Social contributions
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
 * Check if accounting period allows modifications
 */
export function canModifyPeriod(status: 'open' | 'soft_closed' | 'hard_closed'): {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  message: string;
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
      };
    case 'hard_closed':
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: 'Период закрыт окончательно. Изменения невозможны.',
      };
    default:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: 'Неизвестный статус периода',
      };
  }
}
