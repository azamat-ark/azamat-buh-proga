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
import { 
  calculateTrialBalance, 
  type ChartAccount, 
  type JournalLine, 
  type OpeningBalance 
} from '@/lib/accounting-utils';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { formatCurrency } from '@/lib/constants';

export default function TrialBalance() {
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
    queryKey: ['journal-lines', currentCompany?.id, selectedPeriodId],
    queryFn: async () => {
      if (!currentCompany?.id || !selectedPeriodId) return { lines: [], openings: [] };
      
      // Get journal lines from posted entries in the period
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
        lines = (linesData || []).map(l => ({
          account_id: l.account_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        }));
      }
      
      // Get opening balances for the period
      const { data: openingsData, error: openingsError } = await supabase
        .from('account_balances')
        .select('account_id, opening_debit, opening_credit')
        .eq('company_id', currentCompany.id)
        .eq('period_id', selectedPeriodId);
      
      if (openingsError) throw openingsError;
      
      const openings: OpeningBalance[] = (openingsData || []).map(ob => ({
        account_id: ob.account_id,
        opening_debit: Number(ob.opening_debit) || 0,
        opening_credit: Number(ob.opening_credit) || 0,
      }));
      
      return { lines, openings };
    },
    enabled: !!currentCompany?.id && !!selectedPeriodId,
  });

  // Calculate trial balance
  const trialBalance = useMemo(() => {
    if (!chartAccounts.length) return null;
    return calculateTrialBalance(chartAccounts, journalData.lines, journalData.openings);
  }, [chartAccounts, journalData]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const handleExportCSV = () => {
    if (!trialBalance) return;
    const rows = trialBalance.accounts.map(acc => ({
      'Код': acc.code,
      'Наименование': acc.name,
      'Сальдо нач. Дт': acc.openingDebit,
      'Сальдо нач. Кт': acc.openingCredit,
      'Обороты Дт': acc.turnoverDebit,
      'Обороты Кт': acc.turnoverCredit,
      'Сальдо кон. Дт': acc.closingDebit,
      'Сальдо кон. Кт': acc.closingCredit,
    }));
    rows.push({
      'Код': 'ИТОГО',
      'Наименование': '',
      'Сальдо нач. Дт': trialBalance.totals.openingDebit,
      'Сальдо нач. Кт': trialBalance.totals.openingCredit,
      'Обороты Дт': trialBalance.totals.turnoverDebit,
      'Обороты Кт': trialBalance.totals.turnoverCredit,
      'Сальдо кон. Дт': trialBalance.totals.closingDebit,
      'Сальдо кон. Кт': trialBalance.totals.closingCredit,
    });
    exportToCSV(rows, `trial-balance-${selectedPeriod?.name || 'all'}`);
  };

  const handleExportPDF = () => {
    if (!trialBalance) return;
    const rows = trialBalance.accounts.map(acc => [
      acc.code,
      acc.name,
      formatCurrency(acc.openingDebit),
      formatCurrency(acc.openingCredit),
      formatCurrency(acc.turnoverDebit),
      formatCurrency(acc.turnoverCredit),
      formatCurrency(acc.closingDebit),
      formatCurrency(acc.closingCredit),
    ]);
    rows.push([
      'ИТОГО',
      '',
      formatCurrency(trialBalance.totals.openingDebit),
      formatCurrency(trialBalance.totals.openingCredit),
      formatCurrency(trialBalance.totals.turnoverDebit),
      formatCurrency(trialBalance.totals.turnoverCredit),
      formatCurrency(trialBalance.totals.closingDebit),
      formatCurrency(trialBalance.totals.closingCredit),
    ]);
    exportToPDF(
      `Оборотно-сальдовая ведомость\n${selectedPeriod?.name || ''}`,
      ['Код', 'Наименование', 'Сн Дт', 'Сн Кт', 'Об Дт', 'Об Кт', 'Ск Дт', 'Ск Кт'],
      rows,
      `trial-balance-${selectedPeriod?.name || 'all'}`
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Оборотно-сальдовая ведомость</h1>
          <p className="text-muted-foreground">Trial Balance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!trialBalance}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!trialBalance}>
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
            {trialBalance && (
              <div className="flex items-center gap-2">
                {trialBalance.isBalanced ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Сбалансировано
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Не сбалансировано
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
            Выберите период для просмотра ОСВ
          </CardContent>
        </Card>
      ) : trialBalance ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2}>Код</TableHead>
                <TableHead rowSpan={2}>Наименование счёта</TableHead>
                <TableHead colSpan={2} className="text-center border-l">Сальдо на начало</TableHead>
                <TableHead colSpan={2} className="text-center border-l">Обороты</TableHead>
                <TableHead colSpan={2} className="text-center border-l">Сальдо на конец</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-right border-l">Дебет</TableHead>
                <TableHead className="text-right">Кредит</TableHead>
                <TableHead className="text-right border-l">Дебет</TableHead>
                <TableHead className="text-right">Кредит</TableHead>
                <TableHead className="text-right border-l">Дебет</TableHead>
                <TableHead className="text-right">Кредит</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.accounts.map((acc) => (
                <TableRow key={acc.accountId}>
                  <TableCell className="font-mono">{acc.code}</TableCell>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell className="text-right border-l">{acc.openingDebit > 0 ? formatCurrency(acc.openingDebit) : ''}</TableCell>
                  <TableCell className="text-right">{acc.openingCredit > 0 ? formatCurrency(acc.openingCredit) : ''}</TableCell>
                  <TableCell className="text-right border-l">{acc.turnoverDebit > 0 ? formatCurrency(acc.turnoverDebit) : ''}</TableCell>
                  <TableCell className="text-right">{acc.turnoverCredit > 0 ? formatCurrency(acc.turnoverCredit) : ''}</TableCell>
                  <TableCell className="text-right border-l font-medium">{acc.closingDebit > 0 ? formatCurrency(acc.closingDebit) : ''}</TableCell>
                  <TableCell className="text-right font-medium">{acc.closingCredit > 0 ? formatCurrency(acc.closingCredit) : ''}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>ИТОГО</TableCell>
                <TableCell className="text-right border-l">{formatCurrency(trialBalance.totals.openingDebit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trialBalance.totals.openingCredit)}</TableCell>
                <TableCell className="text-right border-l">{formatCurrency(trialBalance.totals.turnoverDebit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trialBalance.totals.turnoverCredit)}</TableCell>
                <TableCell className="text-right border-l">{formatCurrency(trialBalance.totals.closingDebit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trialBalance.totals.closingCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
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
