export interface InvoiceLine {
  item_name: string;
  quantity: number | string;
  price: number | string;
  [key: string]: any; // Allow other properties
}

export const calculateInvoiceTotal = (lines: InvoiceLine[]): number => {
  return lines
    .filter(l => l.price)
    .reduce((sum, l) => sum + (parseFloat(String(l.quantity) || '0') * parseFloat(String(l.price) || '0')), 0);
};
