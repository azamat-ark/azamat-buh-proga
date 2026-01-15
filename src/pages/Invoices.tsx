import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, FileText, Search, Filter, Eye, Check, X } from 'lucide-react';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { validatePositiveNumber, validateNonNegativeNumber } from '@/lib/validation-schemas';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

export default function Invoices() {
  const { currentCompany, canEdit } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    counterparty_id: '',
    notes: '',
    lines: [{ item_name: '', quantity: '1', price: '' }],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', currentCompany?.id, statusFilter],
    queryFn: async () => {
      if (!currentCompany) return [];
      let query = supabase
        .from('invoices')
        .select(`
          *,
          counterparty:counterparties(name)
        `)
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as InvoiceStatus);
      }

      const { data } = await query;
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
        .eq('is_active', true)
        .eq('is_client', true);
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('items')
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

      // Validate and filter lines
      const validatedLines: Array<{ item_name: string; quantity: number; price: number }> = [];
      
      for (const line of formData.lines) {
        if (!line.item_name.trim() && !line.price) continue;
        
        if (!line.item_name.trim()) {
          throw new Error('Укажите название для всех позиций');
        }
        
        const qtyValidation = validatePositiveNumber(line.quantity, 1000000);
        if (!qtyValidation.valid) {
          throw new Error(`Неверное количество для "${line.item_name}": ${qtyValidation.error}`);
        }
        
        const priceValidation = validateNonNegativeNumber(line.price);
        if (!priceValidation.valid) {
          throw new Error(`Неверная цена для "${line.item_name}": ${priceValidation.error}`);
        }
        
        validatedLines.push({
          item_name: line.item_name.slice(0, 200),
          quantity: qtyValidation.value,
          price: priceValidation.value,
        });
      }

      if (validatedLines.length === 0) {
        throw new Error('Добавьте минимум одну позицию');
      }

      const subtotal = validatedLines.reduce((sum, l) => sum + (l.quantity * l.price), 0);

      // Get next invoice number
      const { data: company } = await supabase
        .from('companies')
        .select('invoice_prefix, invoice_next_number')
        .eq('id', currentCompany.id)
        .single();

      const invoiceNumber = `${company?.invoice_prefix || 'INV'}-${String(company?.invoice_next_number || 1).padStart(3, '0')}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: currentCompany.id,
          number: invoiceNumber,
          date: formData.date,
          due_date: formData.due_date,
          counterparty_id: formData.counterparty_id || null,
          status: 'draft',
          subtotal,
          total: subtotal,
          notes: formData.notes?.slice(0, 1000) || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines
      const { error: linesError } = await supabase
        .from('invoice_lines')
        .insert(
          validatedLines.map(l => ({
            invoice_id: invoice.id,
            item_name: l.item_name,
            quantity: l.quantity,
            price: l.price,
            line_total: l.quantity * l.price,
          }))
        );

      if (linesError) throw linesError;

      // Update next invoice number
      await supabase
        .from('companies')
        .update({ invoice_next_number: (company?.invoice_next_number || 1) + 1 })
        .eq('id', currentCompany.id);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        counterparty_id: '',
        notes: '',
        lines: [{ item_name: '', quantity: '1', price: '' }],
      });
      toast({ title: 'Счёт создан' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Статус обновлён' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { item_name: '', quantity: '1', price: '' }],
    });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index),
      });
    }
  };

  const filtered = invoices.filter((inv: any) =>
    inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.counterparty?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotal = () => {
    return formData.lines
      .filter(l => l.price)
      .reduce((sum, l) => sum + (parseFloat(l.quantity || '0') * parseFloat(l.price || '0')), 0);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Документы</h1>
          <p className="text-muted-foreground">
            Счета на оплату
          </p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Новый счёт
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый счёт на оплату</DialogTitle>
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
                    <Label>Дата</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <Label>Оплатить до</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <Label>Контрагент</Label>
                  <Select
                    value={formData.counterparty_id}
                    onValueChange={(value) => setFormData({ ...formData, counterparty_id: value })}
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

                <div className="space-y-2">
                  <Label>Позиции</Label>
                  {formData.lines.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Название"
                        value={line.item_name}
                        onChange={(e) => updateLine(index, 'item_name', e.target.value)}
                      />
                      <Input
                        className="w-20"
                        type="number"
                        placeholder="Кол-во"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      />
                      <Input
                        className="w-28"
                        type="number"
                        placeholder="Цена"
                        value={line.price}
                        onChange={(e) => updateLine(index, 'price', e.target.value)}
                      />
                      {formData.lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить позицию
                  </Button>
                </div>

                <div className="input-group">
                  <Label>Примечание</Label>
                  <Textarea
                    placeholder="Дополнительная информация"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Итого:</span>
                  <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Создать счёт
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, контрагенту..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="sent">Отправлен</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
                <SelectItem value="cancelled">Отменён</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="empty-state py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет счетов</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Создать первый счёт
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv: any) => {
                  const statusInfo = INVOICE_STATUSES[inv.status as keyof typeof INVOICE_STATUSES];
                  return (
                    <TableRow key={inv.id} className="table-row-hover">
                      <TableCell className="font-medium">{inv.number}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell>{inv.counterparty?.name || '-'}</TableCell>
                      <TableCell>
                        <span className={cn('status-badge', statusInfo.class)}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(inv.total))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {canEdit && inv.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'sent' })}
                            >
                              Отправить
                            </Button>
                          )}
                          {canEdit && inv.status === 'sent' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success"
                              onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'paid' })}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Оплачен
                            </Button>
                          )}
                        </div>
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
