import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateTrialBalance, buildProfitLoss, type ChartAccount, type JournalLine, type OpeningBalance } from '@/lib/accounting-utils';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { formatCurrency } from '@/lib/constants';

export default function ProfitLoss() {
  const { currentCompany } = useCompany();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Fetch accounting periods
  const { data: periods = [] } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch chart of accounts
  const { data: chartAccounts = [] } = useQuery({
    queryKey: ['chart-of-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch journal lines for period
  const { data: journalData = { lines: [], openings: [] } } = useQuery({
    queryKey: ['journal-lines-pl', currentCompany?.id, selectedPeriodId],
    queryFn: async () => {
      if (!currentCompany?.id || !selectedPeriodId) return { lines: [], openings: [] };
      
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('period_id', selectedPeriodId)
        .eq('status', 'posted');
      
      if (entriesError) throw entriesError;
      
      const entryIds = entries?.map(e => e.id) || [];
      
      let lines: JournalLine[] = [];
      if (entryIds.length > 0) {
        const { data: linesData, error: linesError } = await supabase
          .from('journal_lines')
          .select('account_id, debit, credit')
          .in('entry_id', entryIds);
        
        if (linesError) throw linesError;
        lines = linesData || [];
      }
      
      return { lines: lines as JournalLine[], openings: [] as OpeningBalance[] };
    },
    enabled: !!currentCompany?.id && !!selectedPeriodId,
  });

  // Calculate P&L
  const profitLoss = useMemo(() => {
    if (!chartAccounts.length) return null;
    const trialBalance = calculateTrialBalance(chartAccounts, journalData.lines, []);
    return buildProfitLoss(trialBalance);
  }, [chartAccounts, journalData]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const handleExportCSV = () => {
    if (!profitLoss) return;
    const rows: any[] = [];
    
    rows.push({ 'Раздел': 'ДОХОДЫ', 'Счёт': '', 'Сумма': '' });
    profitLoss.revenue.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': Math.abs(acc.closingCredit - acc.closingDebit) });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого доходы', 'Сумма': profitLoss.revenue.total });
    
    rows.push({ 'Раздел': 'РАСХОДЫ', 'Счёт': '', 'Сумма': '' });
    profitLoss.expenses.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': acc.closingDebit - acc.closingCredit });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого расходы', 'Сумма': profitLoss.expenses.total });
    
    rows.push({ 'Раздел': '', 'Счёт': 'ЧИСТАЯ ПРИБЫЛЬ (УБЫТОК)', 'Сумма': profitLoss.netIncome });
    
    exportToCSV(rows, `profit-loss-${selectedPeriod?.name || 'all'}`);
  };

  const handleExportPDF = () => {
    if (!profitLoss) return;
    const rows: string[][] = [];
    
    rows.push(['ДОХОДЫ', '', '']);
    profitLoss.revenue.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(Math.abs(acc.closingCredit - acc.closingDebit))]);
    });
    rows.push(['', 'Итого доходы', formatCurrency(profitLoss.revenue.total)]);
    
    rows.push(['РАСХОДЫ', '', '']);
    profitLoss.expenses.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(acc.closingDebit - acc.closingCredit)]);
    });
    rows.push(['', 'Итого расходы', formatCurrency(profitLoss.expenses.total)]);
    
    rows.push(['', 'ЧИСТАЯ ПРИБЫЛЬ (УБЫТОК)', formatCurrency(profitLoss.netIncome)]);
    
    exportToPDF(
      `Отчёт о прибылях и убытках\n${selectedPeriod?.name || ''}`,
      ['Раздел', 'Статья', 'Сумма'],
      rows,
      `profit-loss-${selectedPeriod?.name || 'all'}`
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Отчёт о прибылях и убытках</h1>
          <p className="text-muted-foreground">Profit & Loss Statement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!profitLoss}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!profitLoss}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label>Период</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите период" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {profitLoss && (
              <div className="flex items-center gap-2">
                {profitLoss.netIncome >= 0 ? (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <TrendingUp className="h-3 w-3" />
                    Прибыль: {formatCurrency(profitLoss.netIncome)}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Убыток: {formatCurrency(Math.abs(profitLoss.netIncome))}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedPeriodId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Выберите период для просмотра отчёта
          </CardContent>
        </Card>
      ) : profitLoss ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Доходы</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(profitLoss.revenue.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Расходы</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(profitLoss.expenses.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Чистая прибыль</p>
                <p className={`text-2xl font-bold ${profitLoss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profitLoss.netIncome)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Доходы
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Счёт</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitLoss.revenue.accounts.map((acc) => (
                    <TableRow key={acc.accountId}>
                      <TableCell>{acc.code} — {acc.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Math.abs(acc.closingCredit - acc.closingDebit))}</TableCell>
                    </TableRow>
                  ))}
                  {profitLoss.revenue.accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Нет проводок по доходам
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-green-50 dark:bg-green-950/20 font-bold">
                    <TableCell>Итого доходы</TableCell>
                    <TableCell className="text-right">{formatCurrency(profitLoss.revenue.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Расходы
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Счёт</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitLoss.expenses.accounts.map((acc) => (
                    <TableRow key={acc.accountId}>
                      <TableCell>{acc.code} — {acc.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.closingDebit - acc.closingCredit)}</TableCell>
                    </TableRow>
                  ))}
                  {profitLoss.expenses.accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Нет проводок по расходам
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-red-50 dark:bg-red-950/20 font-bold">
                    <TableCell>Итого расходы</TableCell>
                    <TableCell className="text-right">{formatCurrency(profitLoss.expenses.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Net Income */}
          <Card className={profitLoss.netIncome >= 0 ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="py-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">ЧИСТАЯ ПРИБЫЛЬ (УБЫТОК)</span>
                <span className={`text-3xl font-bold ${profitLoss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profitLoss.netIncome)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет данных для выбранного периода
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
