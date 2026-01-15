/**
 * Kazakhstan Payroll Calculation Module
 * Dynamic tax settings from database
 */

export interface TaxSettings {
  id: string;
  year: number;
  mrp: number;
  mzp: number;
  opv_rate: number;
  opv_cap_mzp: number;
  vosms_employee_rate: number;
  vosms_employer_rate: number;
  ipn_resident_rate: number;
  ipn_nonresident_rate: number;
  standard_deduction_mrp: number;
  social_tax_rate: number;
  social_contrib_rate: number;
  social_contrib_min_mzp: number;
  social_contrib_max_mzp: number;
}

// Default tax settings for 2024 (used when no DB record exists)
export const DEFAULT_TAX_SETTINGS_2024: Omit<TaxSettings, 'id'> = {
  year: 2024,
  mrp: 3692,
  mzp: 85000,
  opv_rate: 0.10,
  opv_cap_mzp: 50,
  vosms_employee_rate: 0.02,
  vosms_employer_rate: 0.03,
  ipn_resident_rate: 0.10,
  ipn_nonresident_rate: 0.20,
  standard_deduction_mrp: 14,
  social_tax_rate: 0.095,
  social_contrib_rate: 0.035,
  social_contrib_min_mzp: 1,
  social_contrib_max_mzp: 7,
};

// Default tax settings for 2025
export const DEFAULT_TAX_SETTINGS_2025: Omit<TaxSettings, 'id'> = {
  year: 2025,
  mrp: 3932,
  mzp: 85000,
  opv_rate: 0.10,
  opv_cap_mzp: 50,
  vosms_employee_rate: 0.02,
  vosms_employer_rate: 0.03,
  ipn_resident_rate: 0.10,
  ipn_nonresident_rate: 0.20,
  standard_deduction_mrp: 14,
  social_tax_rate: 0.095,
  social_contrib_rate: 0.035,
  social_contrib_min_mzp: 1,
  social_contrib_max_mzp: 7,
};

export function getDefaultTaxSettings(year: number): Omit<TaxSettings, 'id'> {
  if (year >= 2025) return { ...DEFAULT_TAX_SETTINGS_2025, year };
  return { ...DEFAULT_TAX_SETTINGS_2024, year };
}

export interface EmployeeDeductionFlags {
  apply_opv: boolean;
  apply_vosms_employee: boolean;
  apply_vosms_employer: boolean;
  apply_social_tax: boolean;
  apply_social_contributions: boolean;
  apply_standard_deduction: boolean;
}

export interface PayrollInput {
  grossSalary: number;
  isTaxResident: boolean;
  flags: EmployeeDeductionFlags;
  taxSettings: TaxSettings | Omit<TaxSettings, 'id'>;
  workedDays?: number;
  totalWorkDays?: number;
}

export interface PayrollCalculation {
  // Gross values
  grossSalary: number;
  
  // Employee deductions (withheld from salary)
  opv: number;
  opvBase: number;
  vosmsEmployee: number;
  ipn: number;
  totalEmployeeDeductions: number;
  
  // Taxable income breakdown
  taxableIncome: number;
  standardDeduction: number;
  
  // Net salary (what employee receives)
  netSalary: number;
  
  // Employer obligations (paid additionally by employer)
  socialTax: number;
  socialTaxBase: number;
  socialContributions: number;
  socialContribBase: number;
  vosmsEmployer: number;
  totalEmployerCost: number;
  
  // Rates used (for display)
  ratesUsed: {
    opvRate: number;
    vosmsEmployeeRate: number;
    vosmsEmployerRate: number;
    ipnRate: number;
    socialTaxRate: number;
    socialContribRate: number;
    mrp: number;
    mzp: number;
    standardDeductionMrp: number;
  };
}

/**
 * Round to integer KZT (consistent rounding)
 */
function roundKZT(amount: number): number {
  return Math.round(amount);
}

/**
 * Calculate payroll for Kazakhstan employee with configurable flags
 */
export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  const { grossSalary, isTaxResident, flags, taxSettings, workedDays, totalWorkDays } = input;
  
  // Adjust for partial month if needed
  let adjustedGross = grossSalary;
  if (workedDays !== undefined && totalWorkDays !== undefined && totalWorkDays > 0) {
    adjustedGross = roundKZT((grossSalary / totalWorkDays) * workedDays);
  }
  
  const { mrp, mzp } = taxSettings;
  
  // ==========================================
  // EMPLOYEE DEDUCTIONS
  // ==========================================
  
  // 1. OPV - Пенсионные взносы
  let opvBase = 0;
  let opv = 0;
  if (flags.apply_opv) {
    opvBase = Math.min(adjustedGross, mzp * taxSettings.opv_cap_mzp);
    opv = roundKZT(opvBase * taxSettings.opv_rate);
  }
  
  // 2. VOSMS Employee - Взносы на ОСМС
  let vosmsEmployee = 0;
  if (flags.apply_vosms_employee) {
    vosmsEmployee = roundKZT(adjustedGross * taxSettings.vosms_employee_rate);
  }
  
  // 3. Calculate taxable income for IPN
  let standardDeduction = 0;
  if (flags.apply_standard_deduction && isTaxResident) {
    standardDeduction = mrp * taxSettings.standard_deduction_mrp;
  }
  
  let taxableIncome = adjustedGross - opv - standardDeduction;
  taxableIncome = Math.max(0, taxableIncome);
  
  // 4. IPN - Индивидуальный подоходный налог
  const ipnRate = isTaxResident ? taxSettings.ipn_resident_rate : taxSettings.ipn_nonresident_rate;
  let ipn = roundKZT(taxableIncome * ipnRate);
  ipn = Math.max(0, ipn);
  
  const totalEmployeeDeductions = opv + vosmsEmployee + ipn;
  const netSalary = adjustedGross - totalEmployeeDeductions;
  
  // ==========================================
  // EMPLOYER OBLIGATIONS
  // ==========================================
  
  // 5. Social Tax - Социальный налог
  const socialTaxBase = adjustedGross - opv;
  
  // 6. Social Contributions - Социальные отчисления
  let socialContribBase = 0;
  let socialContributions = 0;
  if (flags.apply_social_contributions) {
    socialContribBase = Math.min(
      Math.max(adjustedGross, mzp * taxSettings.social_contrib_min_mzp),
      mzp * taxSettings.social_contrib_max_mzp
    );
    socialContributions = roundKZT(socialContribBase * taxSettings.social_contrib_rate);
  }
  
  // Social tax minus social contributions
  let socialTax = 0;
  if (flags.apply_social_tax) {
    socialTax = roundKZT(socialTaxBase * taxSettings.social_tax_rate) - socialContributions;
    socialTax = Math.max(0, socialTax);
  }
  
  // 7. VOSMS Employer - Взносы работодателя на ОСМС
  let vosmsEmployer = 0;
  if (flags.apply_vosms_employer) {
    vosmsEmployer = roundKZT(adjustedGross * taxSettings.vosms_employer_rate);
  }
  
  const totalEmployerCost = adjustedGross + socialTax + socialContributions + vosmsEmployer;
  
  return {
    grossSalary: adjustedGross,
    opv,
    opvBase,
    vosmsEmployee,
    ipn,
    totalEmployeeDeductions,
    taxableIncome,
    standardDeduction,
    netSalary,
    socialTax,
    socialTaxBase,
    socialContributions,
    socialContribBase,
    vosmsEmployer,
    totalEmployerCost,
    ratesUsed: {
      opvRate: taxSettings.opv_rate,
      vosmsEmployeeRate: taxSettings.vosms_employee_rate,
      vosmsEmployerRate: taxSettings.vosms_employer_rate,
      ipnRate: ipnRate,
      socialTaxRate: taxSettings.social_tax_rate,
      socialContribRate: taxSettings.social_contrib_rate,
      mrp: mrp,
      mzp: mzp,
      standardDeductionMrp: taxSettings.standard_deduction_mrp,
    },
  };
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(baseAmount: number, vatRate: '0' | '5' | '12' | 'exempt'): { 
  baseAmount: number; 
  vatAmount: number; 
  totalAmount: number 
} {
  if (vatRate === 'exempt' || vatRate === '0') {
    return { baseAmount: roundKZT(baseAmount), vatAmount: 0, totalAmount: roundKZT(baseAmount) };
  }
  
  const rate = parseInt(vatRate) / 100;
  const vatAmount = roundKZT(baseAmount * rate);
  
  return {
    baseAmount: roundKZT(baseAmount),
    vatAmount,
    totalAmount: roundKZT(baseAmount) + vatAmount,
  };
}

/**
 * Extract VAT from total amount (reverse calculation)
 */
export function extractVATFromTotal(totalAmount: number, vatRate: '0' | '5' | '12' | 'exempt'): {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
} {
  if (vatRate === 'exempt' || vatRate === '0') {
    return { baseAmount: roundKZT(totalAmount), vatAmount: 0, totalAmount: roundKZT(totalAmount) };
  }
  
  const rate = parseInt(vatRate) / 100;
  const baseAmount = roundKZT(totalAmount / (1 + rate));
  const vatAmount = roundKZT(totalAmount) - baseAmount;
  
  return { baseAmount, vatAmount, totalAmount: roundKZT(totalAmount) };
}

/**
 * Format currency for display in Kazakh Tenge
 */
export function formatPayrollAmount(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get period string in YYYY-MM format
 */
export function getPeriodString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get year from period string YYYY-MM
 */
export function getYearFromPeriod(period: string): number {
  return parseInt(period.split('-')[0], 10);
}

/**
 * Get working days in a month (simplified - doesn't account for holidays)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

/**
 * Get default flags for employment type
 */
export function getDefaultFlags(employmentType: 'full_time' | 'contractor'): EmployeeDeductionFlags {
  if (employmentType === 'contractor') {
    return {
      apply_opv: false, // Contractor pays OPV themselves
      apply_vosms_employee: false,
      apply_vosms_employer: false,
      apply_social_tax: false,
      apply_social_contributions: false,
      apply_standard_deduction: true,
    };
  }
  
  return {
    apply_opv: true,
    apply_vosms_employee: true,
    apply_vosms_employer: true,
    apply_social_tax: true,
    apply_social_contributions: true,
    apply_standard_deduction: true,
  };
}

/**
 * Payroll account mapping types
 */
export const PAYROLL_ACCOUNT_MAPPING_TYPES = {
  SALARY_EXPENSE: 'salary_expense',
  SALARY_PAYABLE: 'salary_payable',
  OPV_PAYABLE: 'opv_payable',
  VOSMS_PAYABLE: 'vosms_payable',
  IPN_PAYABLE: 'ipn_payable',
  SOCIAL_TAX_PAYABLE: 'social_tax_payable',
  SOCIAL_CONTRIB_PAYABLE: 'social_contrib_payable',
} as const;

export type PayrollAccountMappingType = typeof PAYROLL_ACCOUNT_MAPPING_TYPES[keyof typeof PAYROLL_ACCOUNT_MAPPING_TYPES];
