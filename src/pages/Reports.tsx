import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, TrendingUp, TrendingDown, Wallet, Download, FileText, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/constants';
import { exportToCSV, exportToPDF, exportReportToPDF } from '@/lib/export-utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reports() {
  const { currentCompany } = useCompany();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch all transactions for the period
  const { data: transactions = [] } = useQuery({
    queryKey: ['report-transactions', currentCompany?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, color, type),
          counterparty:counterparties(id, name),
          account:accounts!transactions_account_id_fkey(id, name)
        `)
        .eq('company_id', currentCompany.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true });
      if (error) {
        console.error('Error fetching report transactions:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentCompany,
  });

  // Fetch accounts for cashflow
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!currentCompany,
  });

  // Calculate P&L data
  const income = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  const expense = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  const profit = income - expense;

  // Group by category for P&L
  const incomeByCategory = transactions
    .filter((t: any) => t.type === 'income' && t.category)
    .reduce((acc: Record<string, { name: string; amount: number; color: string }>, t: any) => {
      const key = t.category.id;
      if (!acc[key]) {
        acc[key] = { name: t.category.name, amount: 0, color: t.category.color };
      }
      acc[key].amount += Number(t.amount);
      return acc;
    }, {});

  const expenseByCategory = transactions
    .filter((t: any) => t.type === 'expense' && t.category)
    .reduce((acc: Record<string, { name: string; amount: number; color: string }>, t: any) => {
      const key = t.category.id;
      if (!acc[key]) {
        acc[key] = { name: t.category.name, amount: 0, color: t.category.color };
      }
      acc[key].amount += Number(t.amount);
      return acc;
    }, {});

  const incomeCategoryData = Object.values(incomeByCategory).sort((a, b) => b.amount - a.amount);
  const expenseCategoryData = Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount);

  // Group by month for trend chart
  const monthlyData = transactions.reduce((acc: Record<string, { month: string; income: number; expense: number }>, t: any) => {
    const month = t.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      acc[month].income += Number(t.amount);
    } else if (t.type === 'expense') {
      acc[month].expense += Number(t.amount);
    }
    return acc;
  }, {});

  const trendData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Cashflow by account
  const cashflowByAccount = accounts.map((account: any) => {
    const accountTransactions = transactions.filter((t: any) => 
      t.account_id === account.id || t.to_account_id === account.id
    );
    
    const inflow = accountTransactions
      .filter((t: any) => t.type === 'income' || (t.type === 'transfer' && t.to_account_id === account.id))
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    const outflow = accountTransactions
      .filter((t: any) => t.type === 'expense' || (t.type === 'transfer' && t.account_id === account.id))
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return {
      name: account.name,
      opening: Number(account.opening_balance) || 0,
      inflow,
      outflow,
      closing: Number(account.current_balance) || 0,
    };
  });

  // Counterparty report
  const counterpartyData = transactions
    .filter((t: any) => t.counterparty)
    .reduce((acc: Record<string, { name: string; income: number; expense: number; count: number }>, t: any) => {
      const key = t.counterparty.id;
      if (!acc[key]) {
        acc[key] = { name: t.counterparty.name, income: 0, expense: 0, count: 0 };
      }
      if (t.type === 'income') {
        acc[key].income += Number(t.amount);
      } else if (t.type === 'expense') {
        acc[key].expense += Number(t.amount);
      }
      acc[key].count++;
      return acc;
    }, {});

  const counterpartyList = Object.values(counterpartyData).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

  const handleExportPL = (format: 'csv' | 'pdf') => {
    const data = [
      ...incomeCategoryData.map(c => ({ type: 'Доход', category: c.name, amount: c.amount })),
      ...expenseCategoryData.map(c => ({ type: 'Расход', category: c.name, amount: c.amount })),
    ];
    const columns = [
      { header: 'Тип', accessor: 'type' },
      { header: 'Категория', accessor: 'category' },
      { header: 'Сумма', accessor: (r: any) => formatCurrency(r.amount) },
    ];
    const filename = `pl_report_${dateFrom}_${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(data, columns, filename);
    } else {
      exportReportToPDF(
        'Отчёт о прибылях и убытках (P&L)',
        `Период: ${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
        [
          { label: 'Всего доходов', value: formatCurrency(income) },
          { label: 'Всего расходов', value: formatCurrency(expense) },
          { label: 'Чистая прибыль', value: formatCurrency(profit) },
        ],
        data,
        columns,
        filename
      );
    }
  };

  const handleExportCashflow = (format: 'csv' | 'pdf') => {
    const columns = [
      { header: 'Счёт', accessor: 'name' },
      { header: 'Нач. остаток', accessor: (r: any) => formatCurrency(r.opening) },
      { header: 'Поступления', accessor: (r: any) => formatCurrency(r.inflow) },
      { header: 'Списания', accessor: (r: any) => formatCurrency(r.outflow) },
      { header: 'Кон. остаток', accessor: (r: any) => formatCurrency(r.closing) },
    ];
    const filename = `cashflow_${dateFrom}_${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(cashflowByAccount, columns, filename);
    } else {
      const totalInflow = cashflowByAccount.reduce((s: number, a: any) => s + a.inflow, 0);
      const totalOutflow = cashflowByAccount.reduce((s: number, a: any) => s + a.outflow, 0);
      const totalClosing = cashflowByAccount.reduce((s: number, a: any) => s + a.closing, 0);
      
      exportReportToPDF(
        'Отчёт о движении денежных средств (ДДС)',
        `Период: ${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
        [
          { label: 'Всего поступлений', value: formatCurrency(totalInflow) },
          { label: 'Всего списаний', value: formatCurrency(totalOutflow) },
          { label: 'Итого на счетах', value: formatCurrency(totalClosing) },
        ],
        cashflowByAccount,
        columns,
        filename
      );
    }
  };

  const handleExportCounterparties = (format: 'csv' | 'pdf') => {
    const columns = [
      { header: 'Контрагент', accessor: 'name' },
      { header: 'Доходы', accessor: (r: any) => formatCurrency(r.income) },
      { header: 'Расходы', accessor: (r: any) => formatCurrency(r.expense) },
      { header: 'Операций', accessor: 'count' },
    ];
    const filename = `counterparties_${dateFrom}_${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(counterpartyList, columns, filename);
    } else {
      const totalIncome = counterpartyList.reduce((s, c) => s + c.income, 0);
      const totalExpense = counterpartyList.reduce((s, c) => s + c.expense, 0);
      
      exportReportToPDF(
        'Отчёт по контрагентам',
        `Период: ${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
        [
          { label: 'Всего контрагентов', value: String(counterpartyList.length) },
          { label: 'Сумма доходов', value: formatCurrency(totalIncome) },
          { label: 'Сумма расходов', value: formatCurrency(totalExpense) },
        ],
        counterpartyList,
        columns,
        filename
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Отчёты</h1>
          <p className="text-muted-foreground">Финансовая аналитика организации</p>
        </div>
      </div>

      {/* Date filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="input-group">
              <Label>Дата с</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="input-group">
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

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего доходов</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(income)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего расходов</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(expense)}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Чистая прибыль</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports tabs */}
      <Tabs defaultValue="pl" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pl">P&L отчёт</TabsTrigger>
          <TabsTrigger value="cashflow">ДДС по счетам</TabsTrigger>
          <TabsTrigger value="counterparties">По контрагентам</TabsTrigger>
        </TabsList>

        {/* P&L Tab */}
        <TabsContent value="pl" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportPL('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportPL('pdf')}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>

          {/* Trend chart */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Динамика доходов и расходов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Доходы" fill="#10b981" />
                      <Bar dataKey="expense" name="Расходы" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Income by category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-success">Доходы по категориям</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeCategoryData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeCategoryData}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                          >
                            {incomeCategoryData.map((entry, index) => (
                              <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {incomeCategoryData.map((cat, index) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.color || COLORS[index % COLORS.length] }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Нет данных о доходах</p>
                )}
              </CardContent>
            </Card>

            {/* Expenses by category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Расходы по категориям</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategoryData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                          >
                            {expenseCategoryData.map((entry, index) => (
                              <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {expenseCategoryData.map((cat, index) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.color || COLORS[index % COLORS.length] }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Нет данных о расходах</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cashflow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportCashflow('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportCashflow('pdf')}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Движение денежных средств по счетам
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashflowByAccount.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Счёт</TableHead>
                      <TableHead className="text-right">Нач. остаток</TableHead>
                      <TableHead className="text-right text-success">Поступления</TableHead>
                      <TableHead className="text-right text-destructive">Списания</TableHead>
                      <TableHead className="text-right">Кон. остаток</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashflowByAccount.map((account: any) => (
                      <TableRow key={account.name}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.opening)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(account.inflow)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(account.outflow)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(account.closing)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Итого</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cashflowByAccount.reduce((s: number, a: any) => s + a.opening, 0))}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(cashflowByAccount.reduce((s: number, a: any) => s + a.inflow, 0))}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(cashflowByAccount.reduce((s: number, a: any) => s + a.outflow, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cashflowByAccount.reduce((s: number, a: any) => s + a.closing, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">Нет счетов</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Counterparties Tab */}
        <TabsContent value="counterparties" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportCounterparties('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportCounterparties('pdf')}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Отчёт по контрагентам</CardTitle>
            </CardHeader>
            <CardContent>
              {counterpartyList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Контрагент</TableHead>
                      <TableHead className="text-right text-success">Доходы</TableHead>
                      <TableHead className="text-right text-destructive">Расходы</TableHead>
                      <TableHead className="text-right">Сальдо</TableHead>
                      <TableHead className="text-right">Операций</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counterpartyList.map((cp) => (
                      <TableRow key={cp.name}>
                        <TableCell className="font-medium">{cp.name}</TableCell>
                        <TableCell className="text-right text-success">
                          {cp.income > 0 ? formatCurrency(cp.income) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {cp.expense > 0 ? formatCurrency(cp.expense) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${cp.income - cp.expense >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(cp.income - cp.expense)}
                        </TableCell>
                        <TableCell className="text-right">{cp.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">Нет данных по контрагентам</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
