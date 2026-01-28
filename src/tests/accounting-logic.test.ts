import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateInvoiceTotal } from '../lib/invoice-calculations';
import { recordPayment } from '../lib/payment-service';
import { buildProfitLoss, TrialBalanceData } from '../lib/accounting-utils';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

describe('Accounting Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Invoice Calculation Test
  describe('Invoice Calculation', () => {
    it('should calculate total correctly for specified items', () => {
      const lines = [
        { item_name: 'Item A', price: 1000, quantity: 2 },
        { item_name: 'Item B', price: 500, quantity: 1 },
      ];

      const total = calculateInvoiceTotal(lines);
      expect(total).toBe(2500);
    });
  });

  // 2. Workflow Logic Test (Invoice -> Payment)
  describe('Workflow Logic (Invoice -> Payment)', () => {
    it('should trigger creation of Payment and Income Transaction', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { current_balance: 1000 } })
        })
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoice_payments') return { insert: mockInsert };
        if (table === 'transactions') return { insert: mockInsert };
        if (table === 'accounts') return { select: mockSelect, update: mockUpdate };
        return {};
      });

      const paymentData = {
        company_id: 'comp_1',
        invoice_id: 'inv_1',
        account_id: 'acc_1',
        amount: 500,
        date: '2023-10-27',
        user_id: 'user_1',
        invoice_number: 'INV-001'
      };

      await recordPayment(mockSupabase as any, paymentData);

      // Verify Payment Creation
      expect(mockSupabase.from).toHaveBeenCalledWith('invoice_payments');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        invoice_id: 'inv_1',
        amount: 500,
      }));

      // Verify Transaction Creation
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        type: 'income',
        invoice_id: 'inv_1',
        amount: 500,
      }));
    });
  });

  // 3. Reporting Logic Test (P&L)
  describe('Reporting Logic (P&L)', () => {
    it('should calculate profit correctly based on transactions', () => {
      // Mock Trial Balance Data derived from transactions
      // Income: 5000, Expense: 2000
      const mockTrialBalance: TrialBalanceData = {
        accounts: [
          {
            accountId: 'acc_rev',
            code: '6000',
            name: 'Revenue',
            accountClass: 'revenue',
            openingDebit: 0,
            openingCredit: 0,
            turnoverDebit: 0,
            turnoverCredit: 5000,
            closingDebit: 0,
            closingCredit: 5000,
          },
          {
            accountId: 'acc_exp',
            code: '7000',
            name: 'Expense',
            accountClass: 'expense',
            openingDebit: 0,
            openingCredit: 0,
            turnoverDebit: 2000,
            turnoverCredit: 0,
            closingDebit: 2000,
            closingCredit: 0,
          },
        ],
        totals: {
          openingDebit: 0, openingCredit: 0,
          turnoverDebit: 2000, turnoverCredit: 5000,
          closingDebit: 2000, closingCredit: 5000
        },
        isBalanced: true
      };

      const result = buildProfitLoss(mockTrialBalance);

      expect(result.revenue.total).toBe(5000);
      expect(result.expenses.total).toBe(2000);
      expect(result.netProfit).toBe(3000);
    });
  });

  // 4. Multi-tenant Isolation Check
  describe('Multi-tenant Isolation Check', () => {
    it('should ensure company_id is passed to database operations', async () => {
       const mockInsert = vi.fn().mockResolvedValue({ error: null });
       // Reuse setup from Workflow test
       mockSupabase.from.mockImplementation((table) => {
         if (table === 'invoice_payments') return { insert: mockInsert };
         if (table === 'transactions') return { insert: mockInsert };
         return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({}) }) }), update: vi.fn().mockReturnValue({ eq: vi.fn() }) };
       });

       const paymentData = {
        company_id: 'comp_tenant_A', // Specific tenant
        invoice_id: 'inv_1',
        account_id: 'acc_1',
        amount: 500,
        date: '2023-10-27',
        user_id: 'user_1',
      };

      await recordPayment(mockSupabase as any, paymentData);

      // Verify that company_id is included in the insert payload
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        company_id: 'comp_tenant_A'
      }));
    });
  });
});
