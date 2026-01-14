import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function Payroll() {
  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Зарплата</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Модуль зарплаты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Учёт сотрудников и начислений будет добавлен в следующих версиях</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
