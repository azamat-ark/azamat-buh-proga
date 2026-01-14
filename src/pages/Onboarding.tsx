import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Building2, Loader2, Sparkles } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, 'Введите название организации'),
  bin_iin: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createCompany, refetchCompanies } = useCompany();
  const [isCreating, setIsCreating] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '', bin_iin: '' },
  });

  const handleSubmit = async (data: CompanyFormData) => {
    setIsCreating(true);
    try {
      const company = await createCompany({
        name: data.name,
        bin_iin: data.bin_iin || null,
      });

      // Refresh companies list and set the new company as current
      await refetchCompanies();
      setCompanyId(company.id);
      toast({ title: 'Организация создана', description: 'Теперь вы можете начать работу' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const fillDemoData = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company');

      // Create demo accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .insert([
          { company_id: companyId, name: 'Расчётный счёт', type: 'bank' as const, opening_balance: 500000, current_balance: 500000 },
          { company_id: companyId, name: 'Касса', type: 'cash' as const, opening_balance: 50000, current_balance: 50000 },
        ])
        .select();

      // Create demo categories
      const { data: categories } = await supabase
        .from('categories')
        .insert([
          { company_id: companyId, name: 'Продажи', type: 'income' as const, color: '#22c55e' },
          { company_id: companyId, name: 'Услуги', type: 'income' as const, color: '#3b82f6' },
          { company_id: companyId, name: 'Аренда', type: 'expense' as const, color: '#ef4444' },
          { company_id: companyId, name: 'Зарплата', type: 'expense' as const, color: '#f59e0b' },
          { company_id: companyId, name: 'Закупки', type: 'expense' as const, color: '#8b5cf6' },
        ])
        .select();

      // Create demo counterparties
      const { data: counterparties } = await supabase
        .from('counterparties')
        .insert([
          { company_id: companyId, name: 'ТОО "Альфа"', is_client: true, email: 'alpha@example.com' },
          { company_id: companyId, name: 'ИП Иванов', is_client: true, phone: '+7 777 123 4567' },
          { company_id: companyId, name: 'ТОО "Поставщик"', is_supplier: true, is_client: false },
        ])
        .select();

      // Create demo items
      await supabase
        .from('items')
        .insert([
          { company_id: companyId, name: 'Консультация', unit: 'час', price_default: 15000 },
          { company_id: companyId, name: 'Разработка', unit: 'час', price_default: 25000 },
          { company_id: companyId, name: 'Поддержка', unit: 'мес', price_default: 100000 },
        ]);

      // Create demo transactions
      if (accounts && categories && counterparties) {
        const bankAccount = accounts.find(a => a.type === 'bank');
        const salesCategory = categories.find(c => c.name === 'Продажи');
        const rentCategory = categories.find(c => c.name === 'Аренда');
        const client = counterparties.find(c => c.is_client);

        await supabase
          .from('transactions')
          .insert([
            {
              company_id: companyId,
              date: new Date().toISOString().split('T')[0],
              type: 'income' as const,
              amount: 250000,
              account_id: bankAccount?.id,
              category_id: salesCategory?.id,
              counterparty_id: client?.id,
              description: 'Оплата по договору',
              created_by: user?.id,
            },
            {
              company_id: companyId,
              date: new Date().toISOString().split('T')[0],
              type: 'expense' as const,
              amount: 80000,
              account_id: bankAccount?.id,
              category_id: rentCategory?.id,
              description: 'Аренда офиса за январь',
              created_by: user?.id,
            },
          ]);

        // Update account balance
        await supabase
          .from('accounts')
          .update({ current_balance: 500000 + 250000 - 80000 })
          .eq('id', bankAccount?.id);
      }

      // Create demo invoices
      if (counterparties) {
        const client = counterparties.find(c => c.is_client);
        
        const { data: invoice } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            number: 'INV-001',
            date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            counterparty_id: client?.id,
            status: 'sent' as const,
            subtotal: 150000,
            total: 150000,
            created_by: user?.id,
          })
          .select()
          .single();

        if (invoice) {
          await supabase
            .from('invoice_lines')
            .insert([
              { invoice_id: invoice.id, item_name: 'Консультация', quantity: 5, price: 15000, line_total: 75000 },
              { invoice_id: invoice.id, item_name: 'Разработка', quantity: 3, price: 25000, line_total: 75000 },
            ]);
        }
      }

      // Create demo employee
      await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          name: 'Петров Алексей',
          position: 'Менеджер',
          salary: 350000,
          hire_date: '2024-01-15',
        });

      return true;
    },
    onSuccess: () => {
      toast({ title: 'Демо-данные добавлены', description: 'Теперь вы можете изучить систему' });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  if (companyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <Building2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl">Организация создана!</CardTitle>
            <CardDescription>
              Хотите добавить демо-данные для ознакомления с системой?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => fillDemoData.mutate()}
              disabled={fillDemoData.isPending}
              className="w-full"
              variant="outline"
            >
              {fillDemoData.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Заполнить демо-данными
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Начать с чистого листа
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
              <Calculator className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Создание организации</CardTitle>
          <CardDescription>
            Для начала работы создайте вашу первую организацию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="input-group">
              <Label htmlFor="name">Название организации *</Label>
              <Input
                id="name"
                placeholder="ТОО 'Моя компания'"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="input-group">
              <Label htmlFor="bin_iin">БИН/ИИН (необязательно)</Label>
              <Input
                id="bin_iin"
                placeholder="123456789012"
                {...form.register('bin_iin')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать организацию
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
