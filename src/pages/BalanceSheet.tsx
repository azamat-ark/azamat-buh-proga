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
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { calculateTrialBalance, buildBalanceSheet, formatKZT, type ChartAccount, type JournalLine, type OpeningBalance } from '@/lib/accounting-utils';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { formatCurrency } from '@/lib/constants';

export default function BalanceSheet() {
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

  // Fetch chart of accounts with is_current flag
  const { data: chartAccounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-full', currentCompany?.id],
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
    queryKey: ['journal-lines-bs', currentCompany?.id, selectedPeriodId],
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
      
      const { data: openingsData, error: openingsError } = await supabase
        .from('account_balances')
        .select('account_id, opening_debit, opening_credit')
        .eq('company_id', currentCompany.id)
        .eq('period_id', selectedPeriodId);
      
      if (openingsError) throw openingsError;
      
      return {
        lines: lines as JournalLine[],
        openings: (openingsData || []) as OpeningBalance[],
      };
    },
    enabled: !!currentCompany?.id && !!selectedPeriodId,
  });

  // Calculate balance sheet
  const balanceSheet = useMemo(() => {
    if (!chartAccounts.length) return null;
    const trialBalance = calculateTrialBalance(chartAccounts, journalData.lines, journalData.openings);
    return buildBalanceSheet(trialBalance);
  }, [chartAccounts, journalData]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const handleExportCSV = () => {
    if (!balanceSheet) return;
    const rows: any[] = [];
    
    rows.push({ 'Раздел': 'АКТИВЫ', 'Счёт': '', 'Сумма': '' });
    rows.push({ 'Раздел': balanceSheet.currentAssets.title, 'Счёт': '', 'Сумма': '' });
    balanceSheet.currentAssets.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': acc.closingDebit - acc.closingCredit });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого оборотные', 'Сумма': balanceSheet.currentAssets.total });
    
    rows.push({ 'Раздел': balanceSheet.nonCurrentAssets.title, 'Счёт': '', 'Сумма': '' });
    balanceSheet.nonCurrentAssets.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': acc.closingDebit - acc.closingCredit });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого внеоборотные', 'Сумма': balanceSheet.nonCurrentAssets.total });
    rows.push({ 'Раздел': '', 'Счёт': 'ИТОГО АКТИВЫ', 'Сумма': balanceSheet.totalAssets });
    
    rows.push({ 'Раздел': 'ПАССИВЫ', 'Счёт': '', 'Сумма': '' });
    rows.push({ 'Раздел': balanceSheet.currentLiabilities.title, 'Счёт': '', 'Сумма': '' });
    balanceSheet.currentLiabilities.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': Math.abs(acc.closingCredit - acc.closingDebit) });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого краткосрочные', 'Сумма': balanceSheet.currentLiabilities.total });
    
    rows.push({ 'Раздел': balanceSheet.equity.title, 'Счёт': '', 'Сумма': '' });
    balanceSheet.equity.accounts.forEach(acc => {
      rows.push({ 'Раздел': '', 'Счёт': `${acc.code} ${acc.name}`, 'Сумма': Math.abs(acc.closingCredit - acc.closingDebit) });
    });
    rows.push({ 'Раздел': '', 'Счёт': 'Итого капитал', 'Сумма': balanceSheet.equity.total });
    rows.push({ 'Раздел': '', 'Счёт': 'ИТОГО ПАССИВЫ', 'Сумма': balanceSheet.totalLiabilitiesAndEquity });
    
    exportToCSV(rows, `balance-sheet-${selectedPeriod?.name || 'all'}`);
  };

  const handleExportPDF = () => {
    if (!balanceSheet) return;
    const rows: string[][] = [];
    
    rows.push(['АКТИВЫ', '', '']);
    rows.push([balanceSheet.currentAssets.title, '', '']);
    balanceSheet.currentAssets.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(acc.closingDebit - acc.closingCredit)]);
    });
    rows.push(['', 'Итого оборотные', formatCurrency(balanceSheet.currentAssets.total)]);
    
    rows.push([balanceSheet.nonCurrentAssets.title, '', '']);
    balanceSheet.nonCurrentAssets.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(acc.closingDebit - acc.closingCredit)]);
    });
    rows.push(['', 'Итого внеоборотные', formatCurrency(balanceSheet.nonCurrentAssets.total)]);
    rows.push(['', 'ИТОГО АКТИВЫ', formatCurrency(balanceSheet.totalAssets)]);
    
    rows.push(['ПАССИВЫ', '', '']);
    rows.push([balanceSheet.currentLiabilities.title, '', '']);
    balanceSheet.currentLiabilities.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(Math.abs(acc.closingCredit - acc.closingDebit))]);
    });
    rows.push(['', 'Итого краткосрочные', formatCurrency(balanceSheet.currentLiabilities.total)]);
    
    rows.push([balanceSheet.equity.title, '', '']);
    balanceSheet.equity.accounts.forEach(acc => {
      rows.push(['', `${acc.code} ${acc.name}`, formatCurrency(Math.abs(acc.closingCredit - acc.closingDebit))]);
    });
    rows.push(['', 'Итого капитал', formatCurrency(balanceSheet.equity.total)]);
    rows.push(['', 'ИТОГО ПАССИВЫ', formatCurrency(balanceSheet.totalLiabilitiesAndEquity)]);
    
    exportToPDF(
      `Бухгалтерский баланс\n${selectedPeriod?.name || ''}`,
      ['Раздел', 'Статья', 'Сумма'],
      rows,
      `balance-sheet-${selectedPeriod?.name || 'all'}`
    );
  };

  const renderSection = (section: { title: string; accounts: any[]; total: number }, isLiability = false) => (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={2} className="font-medium">{section.title}</TableCell>
      </TableRow>
      {section.accounts.map((acc) => {
        const balance = isLiability ? Math.abs(acc.closingCredit - acc.closingDebit) : acc.closingDebit - acc.closingCredit;
        return (
          <TableRow key={acc.accountId}>
            <TableCell className="pl-8">{acc.code} — {acc.name}</TableCell>
            <TableCell className="text-right">{formatCurrency(balance)}</TableCell>
          </TableRow>
        );
      })}
      <TableRow className="bg-muted/20">
        <TableCell className="pl-8 font-medium">Итого {section.title.toLowerCase()}</TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(section.total)}</TableCell>
      </TableRow>
    </>
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Бухгалтерский баланс</h1>
          <p className="text-muted-foreground">Balance Sheet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!balanceSheet}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!balanceSheet}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label>На дату (конец периода)</Label>
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
            {balanceSheet && (
              <div className="flex items-center gap-2">
                {balanceSheet.isBalanced ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Активы = Пассивы
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Баланс не сходится
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
            Выберите период для просмотра баланса
          </CardContent>
        </Card>
      ) : balanceSheet ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle>АКТИВЫ</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Статья</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSection(balanceSheet.currentAssets)}
                  {renderSection(balanceSheet.nonCurrentAssets)}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell>ИТОГО АКТИВЫ</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheet.totalAssets)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader>
              <CardTitle>ПАССИВЫ</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Статья</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSection(balanceSheet.currentLiabilities, true)}
                  {renderSection(balanceSheet.nonCurrentLiabilities, true)}
                  {renderSection(balanceSheet.equity, true)}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell>ИТОГО ПАССИВЫ</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
