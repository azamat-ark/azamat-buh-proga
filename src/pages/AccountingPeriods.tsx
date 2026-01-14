import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  CalendarDays,
  Lock,
  LockOpen,
  AlertTriangle,
  CalendarIcon,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatDate } from '@/lib/constants';

type PeriodStatus = 'open' | 'soft_closed' | 'hard_closed';

interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<PeriodStatus, { label: string; icon: any; class: string }> = {
  open: { label: 'Открыт', icon: LockOpen, class: 'bg-success text-success-foreground' },
  soft_closed: { label: 'Мягко закрыт', icon: AlertTriangle, class: 'bg-warning text-warning-foreground' },
  hard_closed: { label: 'Закрыт', icon: Lock, class: 'bg-destructive text-destructive-foreground' },
};

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export default function AccountingPeriods() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [notes, setNotes] = useState('');

  // Fetch periods
  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as AccountingPeriod[];
    },
    enabled: !!currentCompany?.id,
  });

  // Create period mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
      const endDate = endOfMonth(startDate);
      const periodName = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

      const { error } = await supabase.from('accounting_periods').insert({
        company_id: currentCompany!.id,
        name: periodName,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      setIsDialogOpen(false);
      setNotes('');
      toast({ title: 'Период создан' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Change status mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PeriodStatus }) => {
      const updateData: any = { status };
      if (status !== 'open') {
        updateData.closed_by = user?.id;
        updateData.closed_at = new Date().toISOString();
      } else {
        updateData.closed_by = null;
        updateData.closed_at = null;
      }

      const { error } = await supabase
        .from('accounting_periods')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast({ title: 'Статус изменён' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Quick create next month
  const handleQuickCreate = () => {
    const lastPeriod = periods[0];
    let nextMonth: Date;

    if (lastPeriod) {
      nextMonth = addMonths(new Date(lastPeriod.start_date), 1);
    } else {
      nextMonth = startOfMonth(new Date());
    }

    setSelectedYear(nextMonth.getFullYear());
    setSelectedMonth(nextMonth.getMonth());
    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout
      title="Учётные периоды"
      description="Управление учётными периодами (месяцы, кварталы, года)"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleQuickCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Следующий период
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Новый период
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создание учётного периода</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <Label>Год</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="input-group">
                    <Label>Месяц</Label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">Период: {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                  <p className="text-muted-foreground">
                    {format(startOfMonth(new Date(selectedYear, selectedMonth)), 'dd.MM.yyyy')} —{' '}
                    {format(endOfMonth(new Date(selectedYear, selectedMonth)), 'dd.MM.yyyy')}
                  </p>
                </div>
                <div className="input-group">
                  <Label>Примечания</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Дополнительная информация о периоде"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Создать период
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead className="w-32">Начало</TableHead>
              <TableHead className="w-32">Конец</TableHead>
              <TableHead className="w-32">Статус</TableHead>
              <TableHead className="w-40">Закрыт</TableHead>
              <TableHead className="w-48">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : periods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-8 w-8" />
                    <p>Учётных периодов пока нет</p>
                    <p className="text-sm">Создайте первый период для начала работы</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              periods.map((period) => {
                const statusConfig = STATUS_CONFIG[period.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell>{formatDate(period.start_date)}</TableCell>
                    <TableCell>{formatDate(period.end_date)}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig.class}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {period.closed_at ? formatDate(period.closed_at) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {period.status === 'open' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: period.id,
                                  status: 'soft_closed',
                                })
                              }
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Мягко закрыть
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: period.id,
                                  status: 'hard_closed',
                                })
                              }
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Закрыть
                            </Button>
                          </>
                        )}
                        {period.status === 'soft_closed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: period.id,
                                  status: 'open',
                                })
                              }
                            >
                              <LockOpen className="h-4 w-4 mr-1" />
                              Открыть
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: period.id,
                                  status: 'hard_closed',
                                })
                              }
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Закрыть
                            </Button>
                          </>
                        )}
                        {period.status === 'hard_closed' && (
                          <span className="text-sm text-muted-foreground">
                            Период закрыт
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
        <h4 className="font-medium">Статусы периодов:</h4>
        <ul className="space-y-1 text-muted-foreground">
          <li className="flex items-center gap-2">
            <LockOpen className="h-4 w-4 text-success" />
            <strong>Открыт</strong> — можно создавать и редактировать проводки
          </li>
          <li className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <strong>Мягко закрыт</strong> — проводки только для главного бухгалтера
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            <strong>Закрыт</strong> — никакие изменения невозможны
          </li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
