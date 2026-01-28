import { describe, it, expect } from 'vitest';
import { calculatePayroll, getDefaultFlags, DEFAULT_TAX_SETTINGS_2024 } from './payroll-calculations';

describe('Payroll Calculations', () => {
  it('should calculate payroll correctly for a standard full-time resident employee (2024)', () => {
    const grossSalary = 100000;
    const isTaxResident = true;
    const flags = getDefaultFlags('full_time');
    // Ensure flags are correct for full_time
    expect(flags).toEqual({
      apply_opv: true,
      apply_vosms_employee: true,
      apply_vosms_employer: true,
      apply_social_tax: true,
      apply_social_contributions: true,
      apply_standard_deduction: true,
    });

    const taxSettings = DEFAULT_TAX_SETTINGS_2024;

    const result = calculatePayroll({
      grossSalary,
      isTaxResident,
      flags,
      taxSettings
    });

    // Manual Calculation Verification:
    // 1. OPV: 100,000 * 0.10 = 10,000
    expect(result.opv).toBe(10000);

    // 2. VOSMS Employee: 100,000 * 0.02 = 2,000
    expect(result.vosmsEmployee).toBe(2000);

    // 3. Taxable Income: 100,000 - 10,000 (OPV) - 51,688 (Standard Deduction: 14 * 3692)
    // 90,000 - 51,688 = 38,312
    const expectedStandardDeduction = 14 * 3692; // 51688
    expect(result.standardDeduction).toBe(expectedStandardDeduction);
    expect(result.taxableIncome).toBe(100000 - 10000 - expectedStandardDeduction);

    // 4. IPN: 38,312 * 0.10 = 3,831.2 -> 3,831
    expect(result.ipn).toBe(3831);

    // 5. Net Salary: 100,000 - 10,000 - 2,000 - 3,831 = 84,169
    expect(result.netSalary).toBe(84169);

    // 6. Social Contributions: 100,000 * 0.035 = 3,500
    expect(result.socialContributions).toBe(3500);

    // 7. Social Tax:
    // Base = 100,000 - 10,000 = 90,000
    // Amount = (90,000 * 0.095) - 3,500 = 8,550 - 3,500 = 5,050
    expect(result.socialTax).toBe(5050);

    // 8. VOSMS Employer: 100,000 * 0.03 = 3,000
    expect(result.vosmsEmployer).toBe(3000);
  });

  it('should return correct default flags for contractor', () => {
      const flags = getDefaultFlags('contractor');
      expect(flags).toEqual({
        apply_opv: false,
        apply_vosms_employee: false,
        apply_vosms_employer: false,
        apply_social_tax: false,
        apply_social_contributions: false,
        apply_standard_deduction: true,
      });
  });
});
