import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

export default function Reports() {
  const { currentCompany } = useCompany();

  const { data: stats } = useQuery({
    queryKey: ['reports-stats', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return null;
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, date')
        .eq('company_id', currentCompany.id);

      const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) || 0;
      const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) || 0;

      return { income, expense, profit: income - expense, count: transactions?.length || 0 };
    },
    enabled: !!currentCompany,
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Отчёты</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего доходов</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(stats?.income || 0)}</p>
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
              <p className="text-2xl font-bold text-destructive">{formatCurrency(stats?.expense || 0)}</p>
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
              <p className="text-2xl font-bold">{formatCurrency(stats?.profit || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            P&L отчёт
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Детальные отчёты будут добавлены в следующих версиях</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
