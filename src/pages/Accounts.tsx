import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, Banknote, Building2 } from 'lucide-react';
import { formatCurrency, ACCOUNT_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { validateNonNegativeNumber } from '@/lib/validation-schemas';

type AccountType = Database['public']['Enums']['account_type'];

export default function Accounts() {
  const { currentCompany, canEdit } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as AccountType,
    opening_balance: '',
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany) throw new Error('No company');
      
      // Validate name
      if (!formData.name.trim()) {
        throw new Error('Введите название счёта');
      }
      
      // Validate opening balance
      const balanceValidation = validateNonNegativeNumber(formData.opening_balance);
      if (!balanceValidation.valid) {
        throw new Error(balanceValidation.error || 'Неверный начальный остаток');
      }

      const { error } = await supabase.from('accounts').insert({
        company_id: currentCompany.id,
        name: formData.name.slice(0, 100),
        type: formData.type,
        opening_balance: balanceValidation.value,
        current_balance: balanceValidation.value,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsDialogOpen(false);
      setFormData({ name: '', type: 'bank', opening_balance: '' });
      toast({ title: 'Счёт добавлен' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Счета и кассы</h1>
          <p className="text-muted-foreground">
            Банковские счета и наличные
          </p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый счёт</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="input-group">
                  <Label>Название *</Label>
                  <Input
                    placeholder="Расчётный счёт Kaspi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <Label>Тип</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Банковский счёт
                        </span>
                      </SelectItem>
                      <SelectItem value="cash">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Касса
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="input-group">
                  <Label>Начальный остаток</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Добавить счёт
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Total Balance */}
      <Card className="mb-6 gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <p className="text-sm opacity-80">Общий баланс</p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="empty-state">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет счетов</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить первый счёт
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc: any) => {
            const typeInfo = ACCOUNT_TYPES[acc.type as keyof typeof ACCOUNT_TYPES];
            const isPositive = Number(acc.current_balance) >= 0;
            return (
              <Card key={acc.id} className="stat-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-3 rounded-full',
                      acc.type === 'bank' ? 'bg-primary/10' : 'bg-success/10'
                    )}>
                      {acc.type === 'bank' ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Banknote className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className={cn(
                    'text-2xl font-bold',
                    isPositive ? 'text-foreground' : 'text-destructive'
                  )}>
                    {formatCurrency(Number(acc.current_balance))}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
