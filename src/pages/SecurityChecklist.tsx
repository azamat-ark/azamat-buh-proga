import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Key,
  Lock,
  UserX,
  RefreshCw,
  Eye,
} from 'lucide-react';

export default function SecurityChecklist() {
  const checklistItems = [
    {
      id: 'leaked-password',
      title: 'Защита от утёкших паролей',
      description: 'Включите проверку паролей на утечки в базах данных взломанных сервисов.',
      status: 'warning',
      steps: [
        'Откройте настройки бэкенда (кнопка ниже)',
        'Перейдите в раздел Authentication → Settings → Security',
        'Включите опцию "Leaked Password Protection"',
        'Сохраните изменения',
      ],
      docsUrl: 'https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection',
    },
    {
      id: 'test-users',
      title: 'Тестовые пользователи',
      description: 'Используйте отдельные тестовые аккаунты для разработки, не используйте реальные данные.',
      status: 'info',
      steps: [
        'Создайте отдельного пользователя для тестирования (например, test@example.com)',
        'Не используйте рабочие пароли для тестовых аккаунтов',
        'Регулярно удаляйте неиспользуемые тестовые аккаунты',
      ],
    },
    {
      id: 'rotate-keys',
      title: 'Ротация ключей',
      description: 'Регулярно обновляйте секретные ключи и токены доступа.',
      status: 'info',
      steps: [
        'Проверьте, что секретные ключи не попали в репозиторий',
        'Используйте переменные окружения для хранения секретов',
        'При подозрении на утечку — немедленно обновите ключи',
      ],
    },
    {
      id: 'rls-policies',
      title: 'Политики безопасности (RLS)',
      description: 'Убедитесь, что для всех таблиц настроены корректные политики доступа.',
      status: 'done',
      steps: [
        'Row Level Security (RLS) включен для всех пользовательских таблиц',
        'Политики ограничивают доступ только к данным своей компании',
        'Чувствительные данные (ЗП, ИИН) защищены дополнительными политиками',
      ],
    },
    {
      id: 'mfa',
      title: 'Двухфакторная аутентификация',
      description: 'Рекомендуется включить MFA для владельцев компаний.',
      status: 'optional',
      steps: [
        'Двухфакторная аутентификация может быть настроена для каждого пользователя',
        'Особенно рекомендуется для пользователей с ролью "owner"',
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'warning':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Требует действия</Badge>;
      case 'done':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Выполнено</Badge>;
      case 'info':
        return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Рекомендация</Badge>;
      case 'optional':
        return <Badge variant="outline" className="gap-1">Опционально</Badge>;
      default:
        return null;
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'leaked-password':
        return <Lock className="h-5 w-5" />;
      case 'test-users':
        return <UserX className="h-5 w-5" />;
      case 'rotate-keys':
        return <RefreshCw className="h-5 w-5" />;
      case 'rls-policies':
        return <Shield className="h-5 w-5" />;
      case 'mfa':
        return <Key className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Безопасность
          </h1>
          <p className="text-muted-foreground">
            Чек-лист настройки безопасности системы
          </p>
        </div>
      </div>

      <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-600">Важно</p>
              <p className="text-sm text-muted-foreground">
                Пройдите все пункты чек-листа для обеспечения безопасности данных. 
                Особое внимание уделите пунктам с пометкой "Требует действия".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {checklistItems.map((item) => (
          <Card key={item.id} className={item.status === 'warning' ? 'border-destructive/50' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${item.status === 'warning' ? 'bg-destructive/10 text-destructive' : item.status === 'done' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {getIcon(item.id)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Шаги:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {item.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {item.docsUrl && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.docsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Документация
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Доступ к настройкам бэкенда</CardTitle>
          <CardDescription>
            Для настройки безопасности откройте панель управления Lovable Cloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Нажмите кнопку ниже для открытия настроек бэкенда, где можно управлять 
            аутентификацией, политиками безопасности и другими параметрами.
          </p>
          <Button variant="default">
            <ExternalLink className="h-4 w-4 mr-2" />
            Открыть настройки бэкенда
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Настройки бэкенда доступны через панель Lovable Cloud в правой части экрана.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
