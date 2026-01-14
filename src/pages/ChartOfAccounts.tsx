import { useState, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AccountClass = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  name_kz: string | null;
  account_class: AccountClass;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  allow_manual_entry: boolean;
  description: string | null;
}

const ACCOUNT_CLASS_CONFIG: Record<AccountClass, { label: string; icon: any; color: string }> = {
  asset: { label: 'Актив', icon: Wallet, color: 'bg-blue-500' },
  liability: { label: 'Обязательство', icon: CreditCard, color: 'bg-red-500' },
  equity: { label: 'Капитал', icon: PiggyBank, color: 'bg-purple-500' },
  revenue: { label: 'Доход', icon: TrendingUp, color: 'bg-green-500' },
  expense: { label: 'Расход', icon: TrendingDown, color: 'bg-orange-500' },
};

export default function ChartOfAccounts() {
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<AccountClass | 'all'>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_kz: '',
    account_class: 'asset' as AccountClass,
    parent_id: '',
    allow_manual_entry: true,
    description: '',
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!currentCompany?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('chart_of_accounts').insert({
        company_id: currentCompany!.id,
        code: data.code,
        name: data.name,
        name_kz: data.name_kz || null,
        account_class: data.account_class,
        parent_id: data.parent_id || null,
        allow_manual_entry: data.allow_manual_entry,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setIsDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        name_kz: '',
        account_class: 'asset',
        parent_id: '',
        allow_manual_entry: true,
        description: '',
      });
      toast({ title: 'Счёт добавлен' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Build hierarchical structure
  const accountTree = useMemo(() => {
    const rootAccounts: ChartAccount[] = [];
    const childrenMap = new Map<string, ChartAccount[]>();

    accounts.forEach((account) => {
      if (!account.parent_id) {
        rootAccounts.push(account);
      } else {
        if (!childrenMap.has(account.parent_id)) {
          childrenMap.set(account.parent_id, []);
        }
        childrenMap.get(account.parent_id)!.push(account);
      }
    });

    return { rootAccounts, childrenMap };
  }, [accounts]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(search) ||
          a.name.toLowerCase().includes(search) ||
          a.name_kz?.toLowerCase().includes(search)
      );
    }

    if (filterClass !== 'all') {
      filtered = filtered.filter((a) => a.account_class === filterClass);
    }

    return filtered;
  }, [accounts, searchTerm, filterClass]);

  const toggleExpand = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedAccounts(new Set(accounts.filter((a) => !a.parent_id).map((a) => a.id)));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const renderAccountRow = (account: ChartAccount, level: number = 0) => {
    const config = ACCOUNT_CLASS_CONFIG[account.account_class];
    const Icon = config.icon;
    const children = accountTree.childrenMap.get(account.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <>
        <TableRow key={account.id} className={cn(level > 0 && 'bg-muted/30')}>
          <TableCell className="font-mono">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(account.id)}
                  className="p-1 hover:bg-accent rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              {account.code}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{account.name}</span>
              {account.is_system && (
                <Badge variant="outline" className="text-xs">
                  Системный
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge className={cn(config.color, 'text-white')}>{config.label}</Badge>
          </TableCell>
          <TableCell className="text-muted-foreground">{account.name_kz || '—'}</TableCell>
          <TableCell>
            {account.allow_manual_entry ? (
              <Badge variant="secondary">Да</Badge>
            ) : (
              <Badge variant="outline">Нет</Badge>
            )}
          </TableCell>
        </TableRow>
        {isExpanded && children.map((child) => renderAccountRow(child, level + 1))}
      </>
    );
  };

  // Parent accounts for select (only group accounts)
  const parentAccounts = accounts.filter((a) => !a.allow_manual_entry);

  return (
    <DashboardLayout
      title="План счетов"
      description="Управление планом счетов организации"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить счёт
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый счёт</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <Label>Код счёта *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1030"
                    required
                  />
                </div>
                <div className="input-group">
                  <Label>Тип счёта *</Label>
                  <Select
                    value={formData.account_class}
                    onValueChange={(v) => setFormData({ ...formData, account_class: v as AccountClass })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCOUNT_CLASS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="input-group">
                <Label>Название (рус) *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Денежные средства на текущих счетах"
                  required
                />
              </div>
              <div className="input-group">
                <Label>Название (каз)</Label>
                <Input
                  value={formData.name_kz}
                  onChange={(e) => setFormData({ ...formData, name_kz: e.target.value })}
                  placeholder="Ағымдағы шоттардағы ақша қаражаттары"
                />
              </div>
              <div className="input-group">
                <Label>Родительский счёт</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(v) => setFormData({ ...formData, parent_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Нет (корневой)</SelectItem>
                    {parentAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="input-group">
                <Label>Описание</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание счёта"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow_manual"
                  checked={formData.allow_manual_entry}
                  onChange={(e) =>
                    setFormData({ ...formData, allow_manual_entry: e.target.checked })
                  }
                  className="rounded border-input"
                />
                <Label htmlFor="allow_manual">Разрешить ручной ввод проводок</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                Добавить счёт
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
            placeholder="Поиск по коду или названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v as AccountClass | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все типы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(ACCOUNT_CLASS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Развернуть всё
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Свернуть всё
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Код</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="w-32">Тип</TableHead>
              <TableHead className="w-64">Название (каз)</TableHead>
              <TableHead className="w-24">Проводки</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : searchTerm || filterClass !== 'all' ? (
              filteredAccounts.map((account) => renderAccountRow(account, 0))
            ) : (
              accountTree.rootAccounts.map((account) => renderAccountRow(account, 0))
            )}
            {!isLoading && accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>План счетов не настроен</p>
                    <p className="text-sm">
                      Загрузите шаблон НСФО или МСФО при создании организации
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
