import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Users, Search, Mail, Phone } from 'lucide-react';

export default function Counterparties() {
  const { currentCompany, canEdit } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    bin_iin: '',
    phone: '',
    email: '',
    address: '',
    is_client: true,
    is_supplier: false,
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
        .order('name');
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany) throw new Error('No company');

      const { error } = await supabase.from('counterparties').insert({
        company_id: currentCompany.id,
        name: formData.name,
        bin_iin: formData.bin_iin || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        is_client: formData.is_client,
        is_supplier: formData.is_supplier,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        bin_iin: '',
        phone: '',
        email: '',
        address: '',
        is_client: true,
        is_supplier: false,
      });
      toast({ title: 'Контрагент добавлен' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = counterparties.filter((cp: any) =>
    cp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cp.phone?.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Контрагенты</h1>
          <p className="text-muted-foreground">
            Клиенты и поставщики
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
                <DialogTitle>Новый контрагент</DialogTitle>
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
                    placeholder="ТОО 'Компания'"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <Label>БИН/ИИН</Label>
                  <Input
                    placeholder="123456789012"
                    value={formData.bin_iin}
                    onChange={(e) => setFormData({ ...formData, bin_iin: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <Label>Телефон</Label>
                    <Input
                      placeholder="+7 777 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <Label>Адрес</Label>
                  <Input
                    placeholder="г. Алматы, ул. Абая, 1"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.is_client}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_client: !!checked })
                      }
                    />
                    <span>Клиент</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.is_supplier}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_supplier: !!checked })
                      }
                    />
                    <span>Поставщик</span>
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Добавить контрагента
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
              placeholder="Поиск по названию, email, телефону..."
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
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет контрагентов</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить контрагента
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>БИН/ИИН</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Тип</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cp: any) => (
                  <TableRow key={cp.id} className="table-row-hover">
                    <TableCell className="font-medium">{cp.name}</TableCell>
                    <TableCell>{cp.bin_iin || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cp.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cp.email}
                          </div>
                        )}
                        {cp.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cp.phone}
                          </div>
                        )}
                        {!cp.email && !cp.phone && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cp.is_client && <Badge variant="secondary">Клиент</Badge>}
                        {cp.is_supplier && <Badge variant="outline">Поставщик</Badge>}
                      </div>
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
