export const CURRENCY_SYMBOL = '₸';
export const DEFAULT_CURRENCY = 'KZT';

export const ROLES = {
  owner: { label: 'Владелец', color: 'bg-primary' },
  accountant: { label: 'Бухгалтер', color: 'bg-info' },
  viewer: { label: 'Наблюдатель', color: 'bg-muted' },
  employee: { label: 'Сотрудник', color: 'bg-warning' },
} as const;

export const TAX_REGIMES = {
  simplified: { label: 'Упрощённый режим (СНР)', short: 'Упрощёнка' },
  common: { label: 'Общеустановленный режим (ОУР)', short: 'ОУР' },
  retail_tax: { label: 'Розничный налог', short: 'Розница' },
} as const;

export const INVOICE_STATUSES = {
  draft: { label: 'Черновик', class: 'status-draft' },
  sent: { label: 'Отправлен', class: 'status-sent' },
  paid: { label: 'Оплачен', class: 'status-paid' },
  cancelled: { label: 'Отменён', class: 'status-cancelled' },
} as const;

export const TRANSACTION_TYPES = {
  income: { label: 'Доход', color: 'text-success' },
  expense: { label: 'Расход', color: 'text-destructive' },
  transfer: { label: 'Перевод', color: 'text-primary' },
} as const;

export const ACCOUNT_TYPES = {
  bank: { label: 'Банковский счёт', icon: 'Building2' },
  cash: { label: 'Касса', icon: 'Banknote' },
} as const;

export const CATEGORY_TYPES = {
  income: { label: 'Доход', color: 'bg-success' },
  expense: { label: 'Расход', color: 'bg-destructive' },
} as const;

export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  const symbol = currency === 'KZT' ? CURRENCY_SYMBOL : currency;
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateShort = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
};
