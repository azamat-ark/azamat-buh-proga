import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeDbError, logError } from '@/lib/error-utils';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { usePeriodValidation } from '@/hooks/usePeriodValidation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PeriodValidationAlert } from '@/components/period/PeriodValidationAlert';
import { PeriodStatusBadge } from '@/components/period/PeriodStatusBadge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowRightLeft, TrendingUp, TrendingDown, Search, Filter, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate, TRANSACTION_TYPES, CATEGORY_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ImportCSVDialog } from '@/components/transactions/ImportCSVDialog';
import { ExportButtons } from '@/components/transactions/ExportButtons';
import { Database } from '@/integrations/supabase/types';
import { validatePositiveNumber } from '@/lib/validation-schemas';
import { createTransaction } from '@/lib/transaction-service';

type TransactionType = Database['public']['Enums']['transaction_type'];

export default function Transactions() {
  const { currentCompany, canEdit } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Open dialog when ?add=true is present
  useEffect(() => {
    if (searchParams.get('add') === 'true' && canEdit) {
      setIsDialogOpen(true);
      // Remove the query param after opening
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('add');
        return next;
      }, { replace: true });
    }
  }, [searchParams, canEdit, setSearchParams]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as TransactionType,
    amount: '',
    account_id: '',
    to_account_id: '',
    category_id: '',
    counterparty_id: '',
    description: '',
  });

  // Period validation based on selected date
  const periodValidation = usePeriodValidation(formData.date);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', currentCompany?.id, typeFilter],
    queryFn: async () => {
      if (!currentCompany) return [];
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color),
          counterparty:counterparties(name),
          account:accounts!transactions_account_id_fkey(name),
          to_account:accounts!transactions_to_account_id_fkey(name)
        `)
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as TransactionType);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentCompany,
  });

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const { data: counterparties = [] } = useQuery({
    queryKey: ['counterparties', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('counterparties')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany || !user) throw new Error('No company or user');

      // Validate period first
      if (!periodValidation.isValid) {
        throw new Error(periodValidation.error || 'Период не найден для выбранной даты');
      }
      if (!periodValidation.canWrite) {
        throw new Error(periodValidation.error || 'Период закрыт для изменений');
      }

      // Validate amount
      const amountValidation = validatePositiveNumber(formData.amount);
      if (!amountValidation.valid) {
        throw new Error(amountValidation.error || 'Неверная сумма');
      }

      await createTransaction({
        company_id: currentCompany.id,
        user_id: user.id,
        date: formData.date,
        type: formData.type,
        amount: amountValidation.value,
        account_id: formData.account_id || null,
        to_account_id: formData.type === 'transfer' ? formData.to_account_id || null : null,
        category_id: formData.type !== 'transfer' ? formData.category_id || null : null,
        counterparty_id: formData.counterparty_id || null,
        description: formData.description?.slice(0, 500) || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        amount: '',
        account_id: '',
        to_account_id: '',
        category_id: '',
        counterparty_id: '',
        description: '',
      });
      toast({ title: 'Операция добавлена' });
    },
    onError: (error: any) => {
      logError('createTransaction', error);
      toast({ title: 'Ошибка', description: sanitizeDbError(error), variant: 'destructive' });
    },
  });

  const filteredTransactions = transactions.filter((tx: any) =>
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.counterparty?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter((cat: any) => {
    if (formData.type === 'income') return cat.type === 'income';
    if (formData.type === 'expense') return cat.type === 'expense';
    return false;
  });

  // Check if no periods exist
  const noPeriods = !periodValidation.hasPeriods && !periodValidation.isValidating;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Операции</h1>
          <p className="text-muted-foreground">
            Учёт доходов, расходов и переводов
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={filteredTransactions} filenamePrefix="transactions" title="Операции" />
          {canEdit && (
            <>
              <ImportCSVDialog />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Новая операция</DialogTitle>
                  </DialogHeader>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    {/* Period validation alert */}
                    <PeriodValidationAlert
                      isValid={periodValidation.isValid}
                      canWrite={periodValidation.canWrite}
                      error={periodValidation.error}
                      periodName={periodValidation.periodName}
                      status={periodValidation.status}
                      isValidating={periodValidation.isValidating}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      {(['income', 'expense', 'transfer'] as const).map((type) => {
                        const info = TRANSACTION_TYPES[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type })}
                            className={cn(
                              'p-3 rounded-lg border text-center transition-colors',
                              formData.type === type
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {type === 'income' && (
                              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-success" />
                            )}
                            {type === 'expense' && (
                              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
                            )}
                            {type === 'transfer' && (
                              <ArrowRightLeft className="h-5 w-5 mx-auto mb-1 text-primary" />
                            )}
                            <span className="text-sm">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group">
                        <Label>Дата</Label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                        {periodValidation.periodName && periodValidation.canWrite && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Период: {periodValidation.periodName}
                          </p>
                        )}
                      </div>
                      <div className="input-group">
                        <Label>Сумма *</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <Label>{formData.type === 'transfer' ? 'Со счёта' : 'Счёт'}</Label>
                      <Select
                        value={formData.account_id}
                        onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите счёт" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(Number(acc.current_balance))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.type === 'transfer' && (
                      <div className="input-group">
                        <Label>На счёт</Label>
                        <Select
                          value={formData.to_account_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, to_account_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите счёт" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((acc: any) => acc.id !== formData.account_id)
                              .map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.type !== 'transfer' && (
                      <div className="input-group">
                        <Label>Категория</Label>
                        <Select
                          value={formData.category_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCategories.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="input-group">
                      <Label>Контрагент</Label>
                      <Select
                        value={formData.counterparty_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, counterparty_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите контрагента" />
                        </SelectTrigger>
                        <SelectContent>
                          {counterparties.map((cp: any) => (
                            <SelectItem key={cp.id} value={cp.id}>
                              {cp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="input-group">
                      <Label>Описание</Label>
                      <Input
                        placeholder="Комментарий к операции"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createMutation.isPending || !periodValidation.canWrite}
                    >
                      Добавить операцию
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* No periods warning */}
      {noPeriods && (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">Нет учётных периодов</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Для создания операций необходимо настроить учётные периоды.{' '}
                  <Link to="/periods" className="text-primary underline hover:no-underline">
                    Перейти к периодам →
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по описанию, контрагенту..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="income">Доходы</SelectItem>
                <SelectItem value="expense">Расходы</SelectItem>
                <SelectItem value="transfer">Переводы</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="empty-state py-16">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет операций</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить первую операцию
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Дата</TableHead>
                  <TableHead className="w-28">Тип</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx: any) => {
                  const typeInfo = TRANSACTION_TYPES[tx.type as TransactionType];
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            tx.type === 'income' && 'border-success/30 text-success bg-success/5',
                            tx.type === 'expense' && 'border-destructive/30 text-destructive bg-destructive/5',
                            tx.type === 'transfer' && 'border-primary/30 text-primary bg-primary/5'
                          )}
                        >
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.description || '—'}
                        {tx.type === 'transfer' && tx.account && tx.to_account && (
                          <span className="text-muted-foreground text-xs block">
                            {tx.account.name} → {tx.to_account.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.category ? (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: tx.category.color,
                              backgroundColor: `${tx.category.color}10`,
                            }}
                          >
                            {tx.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.counterparty?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          tx.type === 'income' && 'text-success',
                          tx.type === 'expense' && 'text-destructive'
                        )}
                      >
                        {tx.type === 'income' && '+'}
                        {tx.type === 'expense' && '−'}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
