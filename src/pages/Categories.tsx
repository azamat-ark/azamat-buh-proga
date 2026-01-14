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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { CATEGORY_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type CategoryType = Database['public']['Enums']['category_type'];

export default function Categories() {
  const { currentCompany, canEdit } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as CategoryType,
    color: '#3b82f6',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('type')
        .order('name');
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany) throw new Error('No company');

      const { error } = await supabase.from('categories').insert({
        company_id: currentCompany.id,
        name: formData.name,
        type: formData.type,
        color: formData.color,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsDialogOpen(false);
      setFormData({ name: '', type: 'income', color: '#3b82f6' });
      toast({ title: 'Категория добавлена' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const incomeCategories = categories.filter((c: any) => c.type === 'income');
  const expenseCategories = categories.filter((c: any) => c.type === 'expense');

  const colors = [
    '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6',
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Категории</h1>
          <p className="text-muted-foreground">
            Категории доходов и расходов
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
                <DialogTitle>Новая категория</DialogTitle>
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
                    placeholder="Продажи"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <Label>Тип</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: CategoryType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-success" />
                          Доход
                        </span>
                      </SelectItem>
                      <SelectItem value="expense">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          Расход
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="input-group">
                  <Label>Цвет</Label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          'h-8 w-8 rounded-full transition-transform',
                          formData.color === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Добавить категорию
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="empty-state">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Нет категорий</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить категорию
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Income Categories */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Доходы</h3>
                <Badge variant="secondary">{incomeCategories.length}</Badge>
              </div>
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Нет категорий доходов</p>
              ) : (
                <div className="space-y-2">
                  {incomeCategories.map((cat: any) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Расходы</h3>
                <Badge variant="secondary">{expenseCategories.length}</Badge>
              </div>
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Нет категорий расходов</p>
              ) : (
                <div className="space-y-2">
                  {expenseCategories.map((cat: any) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
