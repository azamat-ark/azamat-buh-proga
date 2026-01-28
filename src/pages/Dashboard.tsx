import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Plus,
  ArrowRightLeft,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatCurrency, formatDate, TRANSACTION_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { currentCompany, canEdit } = useCompany();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return null;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Get transactions for current month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('company_id', currentCompany.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const expense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get accounts balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);

      const totalBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

      // Get unpaid invoices count
      const { count: unpaidInvoices } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .in('status', ['draft', 'sent']);

      return {
        income,
        expense,
        profit: income - expense,
        totalBalance,
        unpaidInvoices: unpaidInvoices || 0,
      };
    },
    enabled: !!currentCompany,
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-charts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return null;

      const now = new Date();
      // Last 6 months for Trend
      // 5 months ago + current month
      const sixMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const sixMonthsAgo = sixMonthsAgoDate.toISOString().split('T')[0];
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: transactions } = await supabase
        .from('transactions')
        .select('date, type, amount, category:categories(name)')
        .eq('company_id', currentCompany.id)
        .gte('date', sixMonthsAgo)
        .lte('date', endOfCurrentMonth);

      if (!transactions) return { trend: [], structure: [] };

      // Process Trend Data
      const trendMap = new Map<string, { name: string, income: number, expense: number }>();

      // Initialize months to ensure all months are present even if no transactions
      for (let i = 0; i < 6; i++) {
         const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
         const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
         const name = d.toLocaleString('ru-RU', { month: 'short' }); // Use Russian locale
         trendMap.set(key, { name: name.charAt(0).toUpperCase() + name.slice(1), income: 0, expense: 0 });
      }

      transactions.forEach(t => {
          const key = t.date.substring(0, 7); // YYYY-MM
          // Only process if within our initialized range (should be, due to query filter)
          // But key format must match loop generation.
          // The loop generates '2025-01' or '2025-10'.
          // t.date '2025-01-15' -> '2025-01'

          if (trendMap.has(key)) {
             const entry = trendMap.get(key)!;
             if (t.type === 'income') entry.income += Number(t.amount);
             if (t.type === 'expense') entry.expense += Number(t.amount);
          }
      });

      const trend = Array.from(trendMap.values());

      // Process Structure Data (Expenses for current month)
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const currentMonthExpenses = transactions.filter(t =>
        t.type === 'expense' && t.date >= startOfCurrentMonth
      );

      const categoryMap = new Map<string, number>();
      currentMonthExpenses.forEach(t => {
         const catName = t.category?.name || 'Без категории';
         categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(t.amount));
      });

      const structure = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) // Sort by amount
        .slice(0, 5); // Top 5

      return { trend, structure };
    },
    enabled: !!currentCompany
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recent-transactions', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name),
          counterparty:counterparties(name),
          account:accounts!transactions_account_id_fkey(name)
        `)
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent transactions:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const { data: counterpartiesCount = 0 } = useQuery({
    queryKey: ['counterparties-count', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return 0;
      const { count } = await supabase
        .from('counterparties')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!currentCompany,
  });

  const statCards = [
    {
      title: 'Доходы за месяц',
      value: formatCurrency(stats?.income || 0),
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Расходы за месяц',
      value: formatCurrency(stats?.expense || 0),
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Прибыль',
      value: formatCurrency(stats?.profit || 0),
      icon: Wallet,
      color: (stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive',
      bgColor: (stats?.profit || 0) >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      title: 'Неоплаченные счета',
      value: String(stats?.unpaidInvoices || 0),
      icon: FileText,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7'];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p className="text-muted-foreground">
            Обзор финансов за текущий месяц
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link to="/transactions?add=true">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Операция
              </Button>
            </Link>
            <Link to="/invoices?add=true">
              <Button size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Счёт
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={cn('text-2xl font-bold mt-1', stat.color)}>
                  {stat.value}
                </p>
              </div>
              <div className={cn('p-3 rounded-full', stat.bgColor)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Visualizations Grid */}
      {chartData && (chartData.trend.length > 0 || chartData.structure.length > 0) && (
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Динамика за 6 месяцев</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.trend}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Доход" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name="Расход" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Структура расходов</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {chartData.structure.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.structure}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.structure.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Нет расходов за текущий месяц
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">
              Последние операции
            </CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm">
                Все операции
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="empty-state py-8">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Нет операций</p>
                {canEdit && (
                  <Link to="/transactions?add=true" className="mt-4">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить операцию
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx: any) => {
                  const typeInfo = TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES];
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          tx.type === 'income' ? 'bg-success/10' : tx.type === 'expense' ? 'bg-destructive/10' : 'bg-primary/10'
                        )}>
                          {tx.type === 'income' ? (
                            <TrendingUp className="h-5 w-5 text-success" />
                          ) : tx.type === 'expense' ? (
                            <TrendingDown className="h-5 w-5 text-destructive" />
                          ) : (
                            <ArrowRightLeft className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tx.counterparty?.name || tx.category?.name || typeInfo.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.date)} • {tx.account?.name}
                          </p>
                        </div>
                      </div>
                      <p className={cn('font-semibold', typeInfo.color)}>
                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                        {formatCurrency(Number(tx.amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Баланс счетов</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(stats?.totalBalance || 0)}
              </p>
              <Link to="/accounts" className="text-sm text-muted-foreground hover:text-primary">
                Управление счетами →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Контрагенты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counterpartiesCount}</p>
              <Link to="/counterparties" className="text-sm text-muted-foreground hover:text-primary">
                Справочник контрагентов →
              </Link>
            </CardContent>
          </Card>

          {stats?.unpaidInvoices && stats.unpaidInvoices > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Неоплаченные счета</p>
                    <p className="text-sm text-muted-foreground">
                      У вас {stats.unpaidInvoices} счёт(ов) ожидает оплаты
                    </p>
                    <Link to="/invoices?status=sent">
                      <Button variant="link" className="px-0 h-auto text-warning">
                        Посмотреть счета
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
