import { z } from 'zod';

// Safe number parsing that rejects NaN/Infinity
const safePositiveNumber = (maxValue = 999999999999) =>
  z.string()
    .transform((val) => {
      const num = parseFloat(val);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return null;
      }
      return num;
    })
    .refine((val) => val !== null, { message: 'Введите корректное число' })
    .refine((val) => val !== null && val > 0, { message: 'Сумма должна быть больше 0' })
    .refine((val) => val !== null && val <= maxValue, { message: `Максимальное значение: ${maxValue.toLocaleString()}` });

const safeNonNegativeNumber = (maxValue = 999999999999) =>
  z.string()
    .transform((val) => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return null;
      }
      return num;
    })
    .refine((val) => val !== null, { message: 'Введите корректное число' })
    .refine((val) => val !== null && val >= 0, { message: 'Значение не может быть отрицательным' })
    .refine((val) => val !== null && val <= maxValue, { message: `Максимальное значение: ${maxValue.toLocaleString()}` });

// Date validation (must be valid YYYY-MM-DD format and within reasonable range)
const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Неверный формат даты' })
  .refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, { message: 'Неверная дата' })
  .refine((val) => {
    const date = new Date(val);
    const minDate = new Date('1990-01-01');
    const maxDate = new Date('2100-12-31');
    return date >= minDate && date <= maxDate;
  }, { message: 'Дата должна быть между 1990 и 2100 годами' });

// Transaction form schema
export const transactionSchema = z.object({
  date: dateString,
  type: z.enum(['income', 'expense', 'transfer']),
  amount: safePositiveNumber(),
  account_id: z.string().optional(),
  to_account_id: z.string().optional(),
  category_id: z.string().optional(),
  counterparty_id: z.string().optional(),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
});

// Invoice form schema
export const invoiceSchema = z.object({
  date: dateString,
  due_date: dateString,
  counterparty_id: z.string().optional(),
  notes: z.string().max(1000, 'Максимум 1000 символов').optional(),
  lines: z.array(z.object({
    item_name: z.string().max(200, 'Максимум 200 символов'),
    quantity: safePositiveNumber(1000000),
    price: safeNonNegativeNumber(),
  })).min(1, 'Добавьте минимум одну позицию'),
});

// Invoice line validation for individual lines
export const invoiceLineSchema = z.object({
  item_name: z.string().min(1, 'Укажите название').max(200, 'Максимум 200 символов'),
  quantity: safePositiveNumber(1000000),
  price: safeNonNegativeNumber(),
});

// Journal entry line schema
export const journalLineSchema = z.object({
  account_id: z.string().min(1, 'Выберите счёт'),
  debit: safeNonNegativeNumber(),
  credit: safeNonNegativeNumber(),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
});

// Journal entry form schema
export const journalEntrySchema = z.object({
  date: z.date(),
  period_id: z.string().min(1, 'Выберите период'),
  document_type_id: z.string().optional(),
  description: z.string().max(1000, 'Максимум 1000 символов').optional(),
});

// Account form schema
export const accountSchema = z.object({
  name: z.string().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  type: z.enum(['bank', 'cash']),
  opening_balance: safeNonNegativeNumber(),
});

// Item form schema
export const itemSchema = z.object({
  name: z.string().min(1, 'Введите название').max(200, 'Максимум 200 символов'),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
  unit: z.string().max(20, 'Максимум 20 символов').optional(),
  price_default: safeNonNegativeNumber(),
});

// Helper function to validate and get errors
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

// Helper to validate a single number input
export function validatePositiveNumber(value: string, maxValue = 999999999999): { valid: boolean; value: number; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, value: 0, error: 'Введите сумму' };
  }
  
  const num = parseFloat(value);
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, value: 0, error: 'Введите корректное число' };
  }
  
  if (num <= 0) {
    return { valid: false, value: 0, error: 'Сумма должна быть больше 0' };
  }
  
  if (num > maxValue) {
    return { valid: false, value: 0, error: `Максимум: ${maxValue.toLocaleString()}` };
  }
  
  return { valid: true, value: num };
}

export function validateNonNegativeNumber(value: string, maxValue = 999999999999): { valid: boolean; value: number; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: true, value: 0 };
  }
  
  const num = parseFloat(value);
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, value: 0, error: 'Введите корректное число' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, error: 'Значение не может быть отрицательным' };
  }
  
  if (num > maxValue) {
    return { valid: false, value: 0, error: `Максимум: ${maxValue.toLocaleString()}` };
  }
  
  return { valid: true, value: num };
}
