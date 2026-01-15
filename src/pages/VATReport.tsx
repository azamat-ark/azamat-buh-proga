import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ArrowUp, ArrowDown, Calculator } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { formatCurrency, formatDate } from '@/lib/constants';

export default function VATReport() {
  const { currentCompany } = useCompany();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch transactions with VAT
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-vat', currentCompany?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          counterparty:counterparties!transactions_counterparty_id_fkey(name),
          account:accounts!transactions_account_id_fkey(name)
        `)
        .eq('company_id', currentCompany.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .neq('vat_rate', 'exempt')
        .order('date', { ascending: false });
      if (error) {
        console.error('Error fetching VAT transactions:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch invoices with VAT
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-vat', currentCompany?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          counterparty:counterparties!invoices_counterparty_id_fkey(name)
        `)
        .eq('company_id', currentCompany.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['sent', 'paid'])
        .order('date', { ascending: false });
      if (error) {
        console.error('Error fetching VAT invoices:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Calculate VAT totals
  const vatSummary = useMemo(() => {
    // Output VAT (from sales/invoices)
    let outputVAT = 0;
    let outputBase = 0;
    
    invoices.forEach(inv => {
      outputVAT += inv.tax_amount || 0;
      outputBase += inv.subtotal || 0;
    });
    
    // Also count income transactions with VAT
    transactions.filter(t => t.type === 'income').forEach(t => {
      outputVAT += t.vat_amount || 0;
      outputBase += t.base_amount || t.amount - (t.vat_amount || 0);
    });
    
    // Input VAT (from purchases/expenses)
    let inputVAT = 0;
    let inputBase = 0;
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
      inputVAT += t.vat_amount || 0;
      inputBase += t.base_amount || t.amount - (t.vat_amount || 0);
    });
    
    const vatPayable = outputVAT - inputVAT;
    
    return {
      outputVAT,
      outputBase,
      inputVAT,
      inputBase,
      vatPayable,
    };
  }, [transactions, invoices]);

  const handleExportCSV = () => {
    const rows = [
      { 'Показатель': 'НДС к начислению (исходящий)', 'База': vatSummary.outputBase, 'НДС': vatSummary.outputVAT },
      { 'Показатель': 'НДС к вычету (входящий)', 'База': vatSummary.inputBase, 'НДС': vatSummary.inputVAT },
      { 'Показатель': 'НДС к уплате / возврату', 'База': '', 'НДС': vatSummary.vatPayable },
    ];
    exportToCSV(rows, `vat-report-${dateFrom}-${dateTo}`);
  };

  const handleExportPDF = () => {
    const rows = [
      ['НДС к начислению (исходящий)', formatCurrency(vatSummary.outputBase), formatCurrency(vatSummary.outputVAT)],
      ['НДС к вычету (входящий)', formatCurrency(vatSummary.inputBase), formatCurrency(vatSummary.inputVAT)],
      ['НДС к уплате / возврату', '', formatCurrency(vatSummary.vatPayable)],
    ];
    exportToPDF(
      `Отчёт по НДС\n${dateFrom} — ${dateTo}`,
      ['Показатель', 'База', 'НДС'],
      rows,
      `vat-report-${dateFrom}-${dateTo}`
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Отчёт по НДС</h1>
          <p className="text-muted-foreground">VAT Report</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div>
              <Label>Дата с</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Дата по</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-green-600" />
              НДС к начислению (исходящий)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(vatSummary.outputVAT)}</p>
            <p className="text-sm text-muted-foreground">База: {formatCurrency(vatSummary.outputBase)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-blue-600" />
              НДС к вычету (входящий)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(vatSummary.inputVAT)}</p>
            <p className="text-sm text-muted-foreground">База: {formatCurrency(vatSummary.inputBase)}</p>
          </CardContent>
        </Card>

        <Card className={vatSummary.vatPayable >= 0 ? 'border-red-500' : 'border-green-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {vatSummary.vatPayable >= 0 ? 'НДС к уплате' : 'НДС к возврату'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${vatSummary.vatPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(vatSummary.vatPayable))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Output VAT Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-green-600" />
            Исходящий НДС (продажи)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Документ</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Ставка</TableHead>
                <TableHead className="text-right">База</TableHead>
                <TableHead className="text-right">НДС</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{formatDate(inv.date)}</TableCell>
                  <TableCell>Счёт {inv.number}</TableCell>
                  <TableCell>{inv.counterparty?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.vat_rate || 'exempt'}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.subtotal || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.tax_amount || 0)}</TableCell>
                </TableRow>
              ))}
              {transactions.filter(t => t.type === 'income' && t.vat_amount).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>{t.description || 'Доход'}</TableCell>
                  <TableCell>{t.counterparty?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.vat_rate}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(t.base_amount || t.amount - (t.vat_amount || 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.vat_amount || 0)}</TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && transactions.filter(t => t.type === 'income' && t.vat_amount).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    Нет операций с исходящим НДС
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Input VAT Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-blue-600" />
            Входящий НДС (покупки)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Ставка</TableHead>
                <TableHead className="text-right">База</TableHead>
                <TableHead className="text-right">НДС</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.filter(t => t.type === 'expense' && t.vat_amount).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>{t.description || 'Расход'}</TableCell>
                  <TableCell>{t.counterparty?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.vat_rate}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(t.base_amount || t.amount - (t.vat_amount || 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.vat_amount || 0)}</TableCell>
                </TableRow>
              ))}
              {transactions.filter(t => t.type === 'expense' && t.vat_amount).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    Нет операций с входящим НДС
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
