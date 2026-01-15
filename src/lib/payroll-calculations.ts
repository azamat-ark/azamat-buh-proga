/**
 * Kazakhstan Payroll Calculation Module
 * Based on 2024/2025 Kazakhstan tax legislation
 */

// Minimum Calculation Indicator (МРП) for 2024
export const MRP_2024 = 3692;

// Minimum Monthly Salary (МЗП) for 2024
export const MZP_2024 = 85000;

// Tax rates for Kazakhstan
export const TAX_RATES = {
  OPV: 0.10, // Обязательные пенсионные взносы (10%)
  VOSMS_EMPLOYEE: 0.02, // Взносы работника на ОСМС (2%)
  VOSMS_EMPLOYER: 0.03, // Взносы работодателя на ОСМС (3%)
  IPN: 0.10, // ИПН (10%)
  SOCIAL_TAX: 0.095, // Социальный налог (9.5%)
  SOCIAL_CONTRIBUTIONS: 0.035, // Социальные отчисления (3.5%)
};

// Standard deduction is 14 MRP
export const STANDARD_DEDUCTION_MRP = 14;

export interface PayrollInput {
  grossSalary: number;
  employmentType: 'full_time' | 'contractor';
  isTaxResident: boolean;
  workedDays?: number;
  totalWorkDays?: number;
}

export interface PayrollCalculation {
  // Gross values
  grossSalary: number;
  
  // Employee deductions (withheld from salary)
  opv: number; // Пенсионные взносы
  vosmsEmployee: number; // ВОСМС работника
  ipn: number; // ИПН
  totalDeductions: number;
  
  // Net salary (what employee receives)
  netSalary: number;
  
  // Employer obligations (paid additionally by employer)
  socialTax: number; // Социальный налог
  socialContributions: number; // Социальные отчисления
  vosmsEmployer: number; // ВОСМС работодателя
  totalEmployerCost: number;
  
  // Breakdown for display
  taxableIncome: number;
  standardDeduction: number;
}

/**
 * Calculate payroll for Kazakhstan employee
 */
export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  const { grossSalary, employmentType, isTaxResident, workedDays, totalWorkDays } = input;
  
  // Adjust for partial month if needed
  let adjustedGross = grossSalary;
  if (workedDays !== undefined && totalWorkDays !== undefined && totalWorkDays > 0) {
    adjustedGross = (grossSalary / totalWorkDays) * workedDays;
  }
  
  // For contractors (ГПХ), different rules apply
  if (employmentType === 'contractor') {
    return calculateContractorPayroll(adjustedGross, isTaxResident);
  }
  
  // ==========================================
  // EMPLOYEE DEDUCTIONS
  // ==========================================
  
  // 1. OPV - Пенсионные взносы (10% от gross, max 50 MZP)
  const opvBase = Math.min(adjustedGross, MZP_2024 * 50);
  const opv = Math.round(opvBase * TAX_RATES.OPV);
  
  // 2. VOSMS Employee - Взносы на ОСМС (2%)
  const vosmsEmployee = Math.round(adjustedGross * TAX_RATES.VOSMS_EMPLOYEE);
  
  // 3. Calculate taxable income for IPN
  // Taxable = Gross - OPV - Standard Deduction (14 MRP)
  const standardDeduction = isTaxResident ? MRP_2024 * STANDARD_DEDUCTION_MRP : 0;
  let taxableIncome = adjustedGross - opv - standardDeduction;
  taxableIncome = Math.max(0, taxableIncome);
  
  // 4. IPN - Индивидуальный подоходный налог (10%)
  // For residents: 10% of taxable income
  // For non-residents: 20% without deductions (simplified here as 10%)
  const ipnRate = isTaxResident ? TAX_RATES.IPN : 0.20;
  let ipn = Math.round(taxableIncome * ipnRate);
  
  // IPN reduction by 90% if conditions met (simplified - not applying here)
  // Apply minimum IPN check
  ipn = Math.max(0, ipn);
  
  const totalDeductions = opv + vosmsEmployee + ipn;
  const netSalary = adjustedGross - totalDeductions;
  
  // ==========================================
  // EMPLOYER OBLIGATIONS
  // ==========================================
  
  // 5. Social Tax - Социальный налог (9.5%)
  // Base = Gross - OPV
  // Social Tax = 9.5% of base - Social Contributions
  const socialTaxBase = adjustedGross - opv;
  
  // 6. Social Contributions - Социальные отчисления (3.5%)
  // Base is between 1 MZP and 7 MZP
  const socContribBase = Math.min(Math.max(adjustedGross, MZP_2024), MZP_2024 * 7);
  const socialContributions = Math.round(socContribBase * TAX_RATES.SOCIAL_CONTRIBUTIONS);
  
  // Social tax minus social contributions
  let socialTax = Math.round(socialTaxBase * TAX_RATES.SOCIAL_TAX) - socialContributions;
  socialTax = Math.max(0, socialTax);
  
  // 7. VOSMS Employer - Взносы работодателя на ОСМС (3%)
  const vosmsEmployer = Math.round(adjustedGross * TAX_RATES.VOSMS_EMPLOYER);
  
  const totalEmployerCost = adjustedGross + socialTax + socialContributions + vosmsEmployer;
  
  return {
    grossSalary: adjustedGross,
    opv,
    vosmsEmployee,
    ipn,
    totalDeductions,
    netSalary,
    socialTax,
    socialContributions,
    vosmsEmployer,
    totalEmployerCost,
    taxableIncome,
    standardDeduction,
  };
}

/**
 * Calculate payroll for contractor (ГПХ)
 * Contractors don't have OPV/Social Tax withheld by employer
 */
function calculateContractorPayroll(grossSalary: number, isTaxResident: boolean): PayrollCalculation {
  // For contractors: only IPN is withheld
  // OPV is paid by contractor themselves
  
  const standardDeduction = isTaxResident ? MRP_2024 * STANDARD_DEDUCTION_MRP : 0;
  const taxableIncome = Math.max(0, grossSalary - standardDeduction);
  
  const ipnRate = isTaxResident ? TAX_RATES.IPN : 0.20;
  const ipn = Math.round(taxableIncome * ipnRate);
  
  const netSalary = grossSalary - ipn;
  
  return {
    grossSalary,
    opv: 0,
    vosmsEmployee: 0,
    ipn,
    totalDeductions: ipn,
    netSalary,
    socialTax: 0,
    socialContributions: 0,
    vosmsEmployer: 0,
    totalEmployerCost: grossSalary,
    taxableIncome,
    standardDeduction,
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
    return { baseAmount, vatAmount: 0, totalAmount: baseAmount };
  }
  
  const rate = parseInt(vatRate) / 100;
  const vatAmount = Math.round(baseAmount * rate * 100) / 100;
  
  return {
    baseAmount,
    vatAmount,
    totalAmount: baseAmount + vatAmount,
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
    return { baseAmount: totalAmount, vatAmount: 0, totalAmount };
  }
  
  const rate = parseInt(vatRate) / 100;
  const baseAmount = Math.round((totalAmount / (1 + rate)) * 100) / 100;
  const vatAmount = Math.round((totalAmount - baseAmount) * 100) / 100;
  
  return { baseAmount, vatAmount, totalAmount };
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
