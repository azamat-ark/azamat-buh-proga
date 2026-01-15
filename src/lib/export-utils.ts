import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from './constants';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string);
}

/**
 * Export data to CSV with column definitions
 */
export function exportToCSV(
  data: any[],
  columnsOrFilename: ExportColumn[] | string,
  filename?: string
): void {
  // Handle two signatures:
  // 1. exportToCSV(data, columns, filename)
  // 2. exportToCSV(data, filename) - for simple object arrays
  
  if (typeof columnsOrFilename === 'string') {
    // Simple export - use object keys as columns
    if (data.length === 0) return;
    
    const keys = Object.keys(data[0]);
    const headers = keys;
    const rows = data.map(row =>
      keys.map(key => {
        const value = row[key];
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${columnsOrFilename}.csv`);
    return;
  }
  
  const columns = columnsOrFilename;
  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename || 'export'}.csv`);
}

/**
 * Export data to PDF with column definitions
 */
export function exportToPDF(
  dataOrTitle: any[] | string,
  columnsOrHeaders: ExportColumn[] | string[],
  filenameOrRows?: string | string[][],
  titleOrFilename?: string,
): void {
  // Handle two signatures:
  // 1. exportToPDF(data, columns, filename, title) - old
  // 2. exportToPDF(title, headers, rows, filename) - new for reports
  
  if (typeof dataOrTitle === 'string') {
    // New signature: exportToPDF(title, headers, rows, filename)
    const title = dataOrTitle;
    const headers = columnsOrHeaders as string[];
    const rows = filenameOrRows as string[][];
    const filename = titleOrFilename as string;
    
    const doc = new jsPDF();
    
    // Add title (may contain newlines)
    const titleLines = title.split('\n');
    let yPos = 20;
    doc.setFontSize(16);
    titleLines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFontSize(16);
      } else {
        doc.setFontSize(11);
        doc.setTextColor(100);
      }
      doc.text(line, 14, yPos);
      yPos += 8;
    });
    doc.setTextColor(0);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPos + 5,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    doc.save(`${filename}.pdf`);
    return;
  }
  
  // Old signature: exportToPDF(data, columns, filename, title)
  const data = dataOrTitle;
  const columns = columnsOrHeaders as ExportColumn[];
  const filename = filenameOrRows as string;
  const title = titleOrFilename;
  
  const doc = new jsPDF();
  
  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 20);
  }

  // Prepare table data
  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      return String(value ?? '');
    })
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  doc.save(`${filename}.pdf`);
}

export function exportReportToPDF(
  title: string,
  subtitle: string,
  summary: { label: string; value: string }[],
  tableData: any[],
  columns: ExportColumn[],
  filename: string
): void {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(subtitle, 14, 28);
  
  // Summary section
  doc.setFontSize(10);
  doc.setTextColor(0);
  let yPos = 40;
  
  summary.forEach((item, index) => {
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.label}:`, 14, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, 60, yPos);
    yPos += 7;
  });

  // Table
  const headers = columns.map(col => col.header);
  const rows = tableData.map(row =>
    columns.map(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      return String(value ?? '');
    })
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: yPos + 10,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Transaction export helpers
export const transactionExportColumns: ExportColumn[] = [
  { header: 'Дата', accessor: (row) => formatDate(row.date) },
  { header: 'Тип', accessor: (row) => {
    const types: Record<string, string> = { income: 'Доход', expense: 'Расход', transfer: 'Перевод' };
    return types[row.type] || row.type;
  }},
  { header: 'Сумма', accessor: (row) => formatCurrency(Number(row.amount)) },
  { header: 'Категория', accessor: (row) => row.category?.name || '-' },
  { header: 'Контрагент', accessor: (row) => row.counterparty?.name || '-' },
  { header: 'Счёт', accessor: (row) => row.account?.name || '-' },
  { header: 'Описание', accessor: (row) => row.description || '-' },
];

// CSV import template
export const CSV_IMPORT_TEMPLATE = `date,type,amount,account,category,counterparty,description
2024-01-15,income,50000,Основной счёт,Продажи,ТОО Клиент,Оплата за услуги
2024-01-16,expense,15000,Касса,Аренда,,Аренда офиса
2024-01-17,transfer,20000,Основной счёт,,,Перевод в кассу`;

export function downloadCSVTemplate(): void {
  const blob = new Blob(['\ufeff' + CSV_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'import_template.csv');
}

export interface ParsedTransaction {
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account: string;
  category: string;
  counterparty: string;
  description: string;
}

export function parseCSV(csvText: string): ParsedTransaction[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV файл должен содержать заголовок и хотя бы одну строку данных');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['date', 'type', 'amount'];
  
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Отсутствует обязательный столбец: ${required}`);
    }
  }

  const results: ParsedTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    const type = row.type?.toLowerCase();
    if (!['income', 'expense', 'transfer'].includes(type)) {
      throw new Error(`Строка ${i + 1}: неверный тип операции "${row.type}". Допустимые: income, expense, transfer`);
    }

    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Строка ${i + 1}: неверная сумма "${row.amount}"`);
    }

    if (!row.date || !isValidDate(row.date)) {
      throw new Error(`Строка ${i + 1}: неверная дата "${row.date}". Формат: YYYY-MM-DD`);
    }

    results.push({
      date: row.date,
      type: type as 'income' | 'expense' | 'transfer',
      amount,
      account: row.account || '',
      category: row.category || '',
      counterparty: row.counterparty || '',
      description: row.description || '',
    });
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
