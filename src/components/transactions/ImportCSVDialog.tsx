import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileText, Check, X } from 'lucide-react';
import { parseCSV, downloadCSVTemplate, ParsedTransaction } from '@/lib/export-utils';
import { formatCurrency } from '@/lib/constants';
import { createTransaction } from '@/lib/transaction-service';

export function ImportCSVDialog() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany || !user) throw new Error('No company or user');

      const promises = parsedData.map(async (tx) => {
        // Find matching account, category, counterparty by name
        const account = accounts.find((a: any) => 
          a.name.toLowerCase() === (tx.account || '').toLowerCase()
        );
        const category = categories.find((c: any) => 
          c.name.toLowerCase() === (tx.category || '').toLowerCase() && c.type === tx.type
        );
        const counterparty = counterparties.find((cp: any) => 
          cp.name.toLowerCase() === (tx.counterparty || '').toLowerCase()
        );

        await createTransaction({
          company_id: currentCompany.id,
          user_id: user.id,
          date: tx.date,
          type: tx.type as any,
          amount: tx.amount,
          account_id: account?.id || null,
          category_id: tx.type !== 'transfer' ? category?.id || null : null,
          counterparty_id: counterparty?.id || null,
          description: tx.description || null,
        });
      });

      await Promise.all(promises);
      
      return parsedData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsOpen(false);
      setParsedData([]);
      setError(null);
      toast({ title: `Импортировано ${count} операций` });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка импорта', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        setParsedData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setParsedData([]);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-1" />
          Импорт CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Импорт операций из CSV</DialogTitle>
        </DialogHeader>

        {parsedData.length === 0 ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Выберите CSV файл для импорта
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={downloadCSVTemplate}>
                  <Download className="h-4 w-4 mr-1" />
                  Скачать шаблон
                </Button>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  Выбрать файл
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
                <p className="font-medium">Ошибка при разборе файла:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Формат CSV файла:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Обязательные столбцы: date, type, amount</li>
                <li>Опциональные: account, category, counterparty, description</li>
                <li>Типы операций: income, expense, transfer</li>
                <li>Формат даты: YYYY-MM-DD</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Найдено операций: <strong>{parsedData.length}</strong>
              </p>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Очистить
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead>Счёт</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Контрагент</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((tx, index) => {
                    const typeLabels: Record<string, string> = {
                      income: 'Доход',
                      expense: 'Расход',
                      transfer: 'Перевод',
                    };
                    const typeColors: Record<string, string> = {
                      income: 'text-success',
                      expense: 'text-destructive',
                      transfer: 'text-primary',
                    };
                    return (
                      <TableRow key={index}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={typeColors[tx.type]}>
                            {typeLabels[tx.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell>{tx.account || '-'}</TableCell>
                        <TableCell>{tx.category || '-'}</TableCell>
                        <TableCell>{tx.counterparty || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-4 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Отмена
              </Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                <Check className="h-4 w-4 mr-1" />
                Импортировать {parsedData.length} операций
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
