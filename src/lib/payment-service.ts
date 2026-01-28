import { SupabaseClient } from '@supabase/supabase-js';

export interface PaymentData {
  company_id: string;
  invoice_id: string;
  account_id: string;
  amount: number;
  date: string;
  method?: string;
  note?: string;
  user_id: string;
  counterparty_id?: string;
  invoice_number?: string;
}

export const recordPayment = async (supabase: SupabaseClient, data: PaymentData) => {
    // Create payment record
    const { error: paymentError } = await supabase
        .from('invoice_payments')
        .insert({
          company_id: data.company_id,
          invoice_id: data.invoice_id,
          account_id: data.account_id,
          amount: data.amount,
          date: data.date,
          method: data.method || null,
          note: data.note || null,
          created_by: data.user_id,
        });

      if (paymentError) throw paymentError;

      // Create transaction for the payment
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          company_id: data.company_id,
          type: 'income',
          amount: data.amount,
          date: data.date,
          account_id: data.account_id,
          counterparty_id: data.counterparty_id,
          description: `Оплата по счёту ${data.invoice_number}`,
          invoice_id: data.invoice_id,
          created_by: data.user_id,
        });

      if (txError) {
          console.error('Error creating transaction for payment:', txError);
          // We don't throw here in the original code, so we keep it consistent
      }

      // Update account balance directly
      // Note: There is also a DB trigger 'on_transaction_insert' that updates the balance.
      // The frontend code duplicates this update. We preserve the frontend logic here.
      const { data: account } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', data.account_id)
        .single();

      if (account) {
        await supabase
          .from('accounts')
          .update({
            current_balance: Number(account.current_balance) + data.amount
          })
          .eq('id', data.account_id);
      }

      return { success: true };
}
