import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction } from '../lib/transaction-service';
import { supabase } from '../integrations/supabase/client';

// Mock supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Accounting Logic', () => {
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockDate = '2023-10-10';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a Journal Entry for Income transaction', async () => {
    const mockTransaction = { id: 'tx-1' };
    const mockPeriodId = 'period-123';
    const mockJournalEntry = { id: 'je-1' };

    // Helper to create chainable mock
    const createChain = (result: any) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: result, error: null }),
          })),
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
      })),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      single: vi.fn().mockResolvedValue({ data: result, error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null }),
            })),
          })),
        };
      }
      if (table === 'chart_of_accounts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, val) => ({
              eq: vi.fn((field2, code) => ({
                single: vi.fn().mockImplementation(() => {
                  // Return mock account ID based on code (last arg passed to eq)
                  // But here we mock the structure not args easily in return
                  // So we just return a generic valid response containing an id
                  return Promise.resolve({ data: { id: `acc-${code}` }, error: null });
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'journal_entries') {
        return {
          insert: vi.fn((data) => {
            // Validate posted status
            if (data.status !== 'posted') throw new Error('Status must be posted');
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockJournalEntry, error: null }),
              })),
            };
          }),
        };
      }
      if (table === 'journal_lines') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return createChain({});
    });

    (supabase.rpc as any).mockResolvedValue({ data: mockPeriodId, error: null });

    await createTransaction({
      company_id: mockCompanyId,
      user_id: mockUserId,
      date: mockDate,
      type: 'income',
      amount: 1000,
      account_id: 'bank-acc-1',
      description: 'Test Income',
    });

    // Check transactions insert
    expect(supabase.from).toHaveBeenCalledWith('transactions');

    // Check period fetch
    expect(supabase.rpc).toHaveBeenCalledWith('get_period_for_date', {
      _company_id: mockCompanyId,
      _date: mockDate,
    });

    // Check accounts fetch (1030 and 6010 for Income w/o invoice)
    expect(supabase.from).toHaveBeenCalledWith('chart_of_accounts');

    // Check Journal Entry creation
    expect(supabase.from).toHaveBeenCalledWith('journal_entries');

    // Check Journal Lines creation
    expect(supabase.from).toHaveBeenCalledWith('journal_lines');
  });

  it('should create a Journal Entry for Expense transaction', async () => {
    const mockTransaction = { id: 'tx-2' };
    const mockPeriodId = 'period-123';
    const mockJournalEntry = { id: 'je-2' };

    // Helper to create chainable mock
    const createChain = (result: any) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: result, error: null }),
          })),
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
      })),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      single: vi.fn().mockResolvedValue({ data: result, error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null }),
            })),
          })),
        };
      }
      if (table === 'chart_of_accounts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, val) => ({
              eq: vi.fn((field2, code) => ({
                single: vi.fn().mockImplementation(() => {
                  return Promise.resolve({ data: { id: `acc-${code}` }, error: null });
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'journal_entries') {
        return {
          insert: vi.fn((data) => {
            if (data.status !== 'posted') throw new Error('Status must be posted');
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockJournalEntry, error: null }),
              })),
            };
          }),
        };
      }
      if (table === 'journal_lines') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return createChain({});
    });

    (supabase.rpc as any).mockResolvedValue({ data: mockPeriodId, error: null });

    await createTransaction({
      company_id: mockCompanyId,
      user_id: mockUserId,
      date: mockDate,
      type: 'expense',
      amount: 500,
      account_id: 'bank-acc-1',
      description: 'Test Expense',
    });

    // Check transactions insert
    expect(supabase.from).toHaveBeenCalledWith('transactions');

    // Check period fetch
    expect(supabase.rpc).toHaveBeenCalledWith('get_period_for_date', {
      _company_id: mockCompanyId,
      _date: mockDate,
    });

    // Check accounts fetch (7210 and 1030 for Expense)
    expect(supabase.from).toHaveBeenCalledWith('chart_of_accounts');

    // Check Journal Entry creation
    expect(supabase.from).toHaveBeenCalledWith('journal_entries');

    // Check Journal Lines creation
    expect(supabase.from).toHaveBeenCalledWith('journal_lines');
  });

  it('5. Journal Entry Sync Test: should create correct journal lines for Income transaction', async () => {
    const mockTransaction = { id: 'tx-sync-1' };
    const mockPeriodId = 'period-sync-1';
    const mockJournalEntry = { id: 'je-sync-1' };

    // Spies to capture calls
    const journalLinesInsertSpy = vi.fn().mockResolvedValue({ error: null });

    // Helper to create chainable mock
    const createChain = (result: any) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: result, error: null }),
          })),
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
      })),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: result, error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: result, error: null }),
      })),
      single: vi.fn().mockResolvedValue({ data: result, error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null }),
            })),
          })),
        };
      }
      if (table === 'chart_of_accounts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field, val) => ({
              eq: vi.fn((field2, code) => ({
                single: vi.fn().mockImplementation(() => {
                  return Promise.resolve({ data: { id: `acc-${code}` }, error: null });
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'journal_entries') {
        return {
          insert: vi.fn((data) => {
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockJournalEntry, error: null }),
              })),
            };
          }),
        };
      }
      if (table === 'journal_lines') {
        return {
          insert: journalLinesInsertSpy,
        };
      }
      return createChain({});
    });

    (supabase.rpc as any).mockResolvedValue({ data: mockPeriodId, error: null });

    const amount = 1500;
    await createTransaction({
      company_id: mockCompanyId,
      user_id: mockUserId,
      date: mockDate,
      type: 'income',
      amount: amount,
      account_id: 'bank-acc-1',
      description: 'Sync Test Income',
    });

    // Assertions
    expect(journalLinesInsertSpy).toHaveBeenCalledTimes(1);

    // Check the arguments passed to insert
    const insertedLines = journalLinesInsertSpy.mock.calls[0][0];

    expect(insertedLines).toHaveLength(2);

    // Line 1: Debit 1030 (Cash/Bank)
    const debitLine = insertedLines.find((l: any) => l.account_id === 'acc-1030');
    expect(debitLine).toBeDefined();
    expect(debitLine.debit).toBe(amount);
    expect(debitLine.credit).toBe(0);
    expect(debitLine.entry_id).toBe(mockJournalEntry.id);

    // Line 2: Credit 6010 (Revenue - since no invoice_id provided)
    const creditLine = insertedLines.find((l: any) => l.account_id === 'acc-6010');
    expect(creditLine).toBeDefined();
    expect(creditLine.credit).toBe(amount);
    expect(creditLine.debit).toBe(0);
    expect(creditLine.entry_id).toBe(mockJournalEntry.id);
  });
});
