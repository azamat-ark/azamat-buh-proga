import { useState, useMemo } from 'react';
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
  Search,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  CalendarIcon,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency, formatDate } from '@/lib/constants';

type JournalStatus = 'draft' | 'posted' | 'reversed';

interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  period_id: string;
  document_type_id: string | null;
  description: string | null;
  status: JournalStatus;
  posted_at: string | null;
  created_at: string;
  period?: { name: string };
  document_type?: { name: string };
  lines?: JournalLine[];
}

interface JournalLine {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  line_number: number;
  account?: { code: string; name: string };
}

interface NewLine {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
}

const STATUS_CONFIG: Record<JournalStatus, { label: string; icon: any; class: string }> = {
  draft: { label: 'Черновик', icon: Clock, class: 'bg-muted text-muted-foreground' },
  posted: { label: 'Проведён', icon: CheckCircle, class: 'bg-success text-success-foreground' },
  reversed: { label: 'Сторнирован', icon: XCircle, class: 'bg-destructive/20 text-destructive' },
};

export default function JournalEntries() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<JournalStatus | 'all'>('all');
  const [formData, setFormData] = useState({
    date: new Date(),
    period_id: '',
    document_type_id: '',
    description: '',
  });
  const [lines, setLines] = useState<NewLine[]>([
    { account_id: '', debit: '', credit: '', description: '' },
    { account_id: '', debit: '', credit: '', description: '' },
  ]);

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          period:accounting_periods(name),
          document_type:document_types(name)
        `)
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch accounting periods
  const { data: periods = [] } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .neq('status', 'hard_closed')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch chart of accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .eq('allow_manual_entry', true)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.period_id) throw new Error('Выберите период');
      
      const validLines = lines.filter(
        (l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
      );
      
      if (validLines.length < 2) {
        throw new Error('Добавьте минимум 2 строки проводки');
      }

      const totalDebit = validLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
      const totalCredit = validLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);

      if (totalDebit !== totalCredit) {
        throw new Error(`Дебет (${totalDebit}) не равен кредиту (${totalCredit})`);
      }

      // Create entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: currentCompany!.id,
          date: format(formData.date, 'yyyy-MM-dd'),
          period_id: formData.period_id,
          document_type_id: formData.document_type_id || null,
          description: formData.description || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create lines
      const { error: linesError } = await supabase.from('journal_lines').insert(
        validLines.map((l, i) => ({
          entry_id: entry.id,
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null,
          line_number: i + 1,
        }))
      );

      if (linesError) throw linesError;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setIsDialogOpen(false);
      setFormData({ date: new Date(), period_id: '', document_type_id: '', description: '' });
      setLines([
        { account_id: '', debit: '', credit: '', description: '' },
        { account_id: '', debit: '', credit: '', description: '' },
      ]);
      toast({ title: 'Проводка создана' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Post mutation
  const postMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: user?.id,
        })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Проводка проведена' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch entry details for view
  const fetchEntryDetails = async (entryId: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        period:accounting_periods(name),
        document_type:document_types(name),
        lines:journal_lines(
          *,
          account:chart_of_accounts(code, name)
        )
      `)
      .eq('id', entryId)
      .single();

    if (error) throw error;
    setViewEntry(data as JournalEntry);
  };

  const addLine = () => {
    setLines([...lines, { account_id: '', debit: '', credit: '', description: '' }]);
  };

  const updateLine = (index: number, field: keyof NewLine, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-clear opposite field
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.entry_number.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((e) => e.status === filterStatus);
    }
    return filtered;
  }, [entries, searchTerm, filterStatus]);

  return (
    <DashboardLayout
      title="Журнал проводок"
      description="Главный журнал бухгалтерских проводок"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Новая проводка
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новая проводка</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="input-group">
                  <Label>Дата *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.date, 'dd.MM.yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(d) => d && setFormData({ ...formData, date: d })}
                        locale={ru}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="input-group">
                  <Label>Период *</Label>
                  <Select
                    value={formData.period_id}
                    onValueChange={(v) => setFormData({ ...formData, period_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите период" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="input-group">
                  <Label>Тип документа</Label>
                  <Select
                    value={formData.document_type_id}
                    onValueChange={(v) => setFormData({ ...formData, document_type_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="input-group">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание операции"
                  rows={2}
                />
              </div>

              {/* Journal Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Строки проводки</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" /> Строка
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Счёт</TableHead>
                        <TableHead className="w-24">Дебет</TableHead>
                        <TableHead className="w-24">Кредит</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select
                              value={line.account_id}
                              onValueChange={(v) => updateLine(i, 'account_id', v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Счёт" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code} - {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.debit}
                              onChange={(e) => updateLine(i, 'debit', e.target.value)}
                              placeholder="0"
                              className="h-8"
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.credit}
                              onChange={(e) => updateLine(i, 'credit', e.target.value)}
                              placeholder="0"
                              className="h-8"
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(i, 'description', e.target.value)}
                              placeholder="Описание"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeLine(i)}
                              disabled={lines.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell>Итого:</TableCell>
                        <TableCell className={cn(!isBalanced && totalDebit > 0 && 'text-destructive')}>
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className={cn(!isBalanced && totalCredit > 0 && 'text-destructive')}>
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell colSpan={2}>
                          {isBalanced ? (
                            <Badge variant="outline\" className="bg-success/10 text-success">
                              Сбалансировано
                            </Badge>
                          ) : totalDebit > 0 || totalCredit > 0 ? (
                            <Badge variant="destructive">
                              Разница: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                            </Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || !isBalanced}
              >
                Создать проводку
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as JournalStatus | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Номер</TableHead>
              <TableHead className="w-28">Дата</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-32">Период</TableHead>
              <TableHead className="w-32">Тип</TableHead>
              <TableHead className="w-28">Статус</TableHead>
              <TableHead className="w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Проводок пока нет</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const statusConfig = STATUS_CONFIG[entry.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.entry_number}</TableCell>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.description || '—'}
                    </TableCell>
                    <TableCell>{entry.period?.name || '—'}</TableCell>
                    <TableCell>{entry.document_type?.name || 'Ручная'}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig.class}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => fetchEntryDetails(entry.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {entry.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => postMutation.mutate(entry.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
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

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Проводка {viewEntry?.entry_number}</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Дата:</span>{' '}
                  {formatDate(viewEntry.date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Период:</span>{' '}
                  {viewEntry.period?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Тип:</span>{' '}
                  {viewEntry.document_type?.name || 'Ручная проводка'}
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>{' '}
                  <Badge className={STATUS_CONFIG[viewEntry.status].class}>
                    {STATUS_CONFIG[viewEntry.status].label}
                  </Badge>
                </div>
              </div>
              {viewEntry.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Описание:</span>{' '}
                  {viewEntry.description}
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Счёт</TableHead>
                      <TableHead className="w-32 text-right">Дебет</TableHead>
                      <TableHead className="w-32 text-right">Кредит</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewEntry.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <span className="font-mono mr-2">{line.account?.code}</span>
                          {line.account?.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.debit > 0 ? formatCurrency(line.debit) : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.credit > 0 ? formatCurrency(line.credit) : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
