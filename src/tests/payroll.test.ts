import { describe, it, expect } from 'vitest';
import { calculatePayroll, DEFAULT_TAX_SETTINGS_2024, getDefaultFlags } from '../lib/payroll-calculations';

describe('Payroll Calculations', () => {
  const baseSettings = { ...DEFAULT_TAX_SETTINGS_2024 };

  it('should calculate standard deductions correctly', () => {
    const input = {
      grossSalary: 100000,
      isTaxResident: true,
      flags: getDefaultFlags('full_time'),
      taxSettings: baseSettings
    };

    const result = calculatePayroll(input);

    // OPV: 10% = 10000
    expect(result.opv).toBe(10000);
    // VOSMS Employee: 2% = 2000
    expect(result.vosmsEmployee).toBe(2000);
    // Taxable Income: 100000 - 10000 - 2000 - 14*MRP(3692) = 100000 - 12000 - 51688 = 36312
    const taxable = 100000 - 10000 - 2000 - (14 * 3692);
    expect(result.taxableIncome).toBe(taxable);
    // IPN: 10% of taxable
    expect(result.ipn).toBe(Math.round(taxable * 0.1));

    // Check OPVR (Employer Pension): 1.5%
    expect(result.opvr).toBe(Math.round(100000 * 0.015));
  });

  it('should apply progressive IPN if ytd income exceeds threshold', () => {
    const settings = {
        ...baseSettings,
        ipn_progressive_threshold: 100000 // Low threshold for test
    };

    const input = {
      grossSalary: 200000,
      isTaxResident: true,
      flags: getDefaultFlags('full_time'),
      taxSettings: settings,
      ytdIncome: 150000 // Already above threshold
    };

    const result = calculatePayroll(input);

    // Taxable Income calculation same as above
    const taxable = 200000 - 20000 - 4000 - (14 * 3692);

    // Since ytdIncome > threshold, rate should be 15%
    expect(result.ipn).toBe(Math.round(taxable * 0.15));
  });

  it('should calculate Unified Payment', () => {
    const flags = { ...getDefaultFlags('full_time'), use_unified_payment: true };

    const input = {
      grossSalary: 100000,
      isTaxResident: true,
      flags: flags,
      taxSettings: baseSettings
    };

    const result = calculatePayroll(input);

    // Unified Payment Rate: 21.5% = 21500
    // But we split it.
    // Employee part: OPV (50% of 21500 = 10750) + IPN (9% of 21500 = 1935)
    // Total Employee Deduction: 12685

    const up = Math.round(100000 * 0.215);
    const empPart = Math.round(up * 0.50) + Math.round(up * 0.09);

    expect(result.unifiedPaymentEmployeePart).toBe(empPart);
    expect(result.opv).toBe(Math.round(up * 0.50));
    expect(result.ipn).toBe(Math.round(up * 0.09));
  });
});
