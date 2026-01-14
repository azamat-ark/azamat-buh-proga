import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Settings as SettingsIcon } from 'lucide-react';
import { ROLES } from '@/lib/constants';

export default function Settings() {
  const { currentCompany, userRole } = useCompany();

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Организация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Название</p>
              <p className="font-medium">{currentCompany?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">БИН/ИИН</p>
              <p className="font-medium">{currentCompany?.bin_iin || 'Не указан'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Валюта</p>
              <p className="font-medium">{currentCompany?.default_currency}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ваша роль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{userRole ? ROLES[userRole].label : '-'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {userRole === 'owner' && 'Полный доступ ко всем функциям'}
              {userRole === 'accountant' && 'Доступ к учёту и документам'}
              {userRole === 'viewer' && 'Только просмотр отчётов'}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
