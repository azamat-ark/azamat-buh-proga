import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';
import { validateNonNegativeNumber } from '@/lib/validation-schemas';

export default function Items() {
  const { currentCompany, canEdit } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'шт',
    price_default: '',
    nkt_code: '',
    gtin: '',
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('items')
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
        throw new Error('Введите название');
      }

      // Validate price
      const priceValidation = validateNonNegativeNumber(formData.price_default);
      if (!priceValidation.valid) {
        throw new Error(priceValidation.error || 'Неверная цена');
      }

      const { error } = await supabase.from('items').insert({
        company_id: currentCompany.id,
        name: formData.name.slice(0, 200),
        description: formData.description?.slice(0, 500) || null,
        unit: formData.unit?.slice(0, 20) || 'шт',
        price_default: priceValidation.value,
        nkt_code: formData.nkt_code?.slice(0, 50) || null,
        gtin: formData.gtin?.slice(0, 50) || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', unit: 'шт', price_default: '', nkt_code: '', gtin: '' });
      toast({ title: 'Товар/услуга добавлен(а)' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = items.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Товары и услуги</h1>
          <p className="text-muted-foreground">
            Справочник товаров и услуг для счетов
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Новый товар/услуга</DialogTitle>
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
                    placeholder="Консультация"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <Label>Описание</Label>
                  <Input
                    placeholder="Краткое описание"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <Label>Единица измерения</Label>
                    <Input
                      placeholder="шт"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <Label>Цена по умолчанию</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.price_default}
                      onChange={(e) => setFormData({ ...formData, price_default: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border">
                  <div className="input-group">
                    <Label>Код НКТ (compliance)</Label>
                    <Input
                      placeholder="Код НКТ"
                      value={formData.nkt_code}
                      onChange={(e) => setFormData({ ...formData, nkt_code: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <Label>GTIN (штрихкод)</Label>
                    <Input
                      placeholder="GTIN"
                      value={formData.gtin}
                      onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Добавить
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="empty-state py-16">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет товаров/услуг</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить товар/услугу
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Код НКТ</TableHead>
                  <TableHead>Единица</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item: any) => (
                  <TableRow key={item.id} className="table-row-hover">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.nkt_code || '-'}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(item.price_default))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
