import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, QrCode } from 'lucide-react';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';

export default function InvoiceDetails() {
  const { id } = useParams();
  const { currentCompany } = useCompany();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id || !currentCompany) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          counterparty:counterparties(*),
          lines:invoice_lines(*)
        `)
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!currentCompany
  });

  if (isLoading) {
    return <DashboardLayout><div>Загрузка...</div></DashboardLayout>;
  }

  if (!invoice) {
    return <DashboardLayout><div>Счёт не найден</div></DashboardLayout>;
  }

  const statusInfo = INVOICE_STATUSES[invoice.status as keyof typeof INVOICE_STATUSES] || { label: invoice.status, class: '' };

  // Kaspi QR logic
  // Format: https://kaspi.kz/pay/YourBizId?amount={total}&orderId={invoice_number}
  // Using bin_iin as fallback for BizId
  const bizId = currentCompany?.bin_iin || 'DEMO';
  const qrUrl = `https://kaspi.kz/pay/${bizId}?amount=${Math.round(invoice.total)}&orderId=${invoice.number}`;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">Счёт {invoice.number}</h1>
            <p className="text-muted-foreground">
              от {formatDate(invoice.date)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                   <h2 className="text-2xl font-bold mb-1">СЧЁТ НА ОПЛАТУ</h2>
                   <p className="text-sm text-muted-foreground">№ {invoice.number} от {formatDate(invoice.date)}</p>
                </div>
                <div className={cn('px-3 py-1 rounded-full text-sm font-medium', statusInfo.class)}>
                  {statusInfo.label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-8">
                 <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Поставщик:</h3>
                    <p className="font-medium">{currentCompany?.name}</p>
                    <p className="text-sm">{currentCompany?.bin_iin ? `БИН/ИИН: ${currentCompany.bin_iin}` : ''}</p>
                    <p className="text-sm">{currentCompany?.address}</p>
                 </div>
                 <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Покупатель:</h3>
                    <p className="font-medium">{invoice.counterparty?.name}</p>
                    <p className="text-sm">{invoice.counterparty?.bin_iin ? `БИН/ИИН: ${invoice.counterparty.bin_iin}` : ''}</p>
                    <p className="text-sm">{invoice.counterparty?.address}</p>
                 </div>
              </div>

              <div className="mt-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Наименование</th>
                      <th className="text-right py-2 font-medium">Кол-во</th>
                      <th className="text-right py-2 font-medium">Цена</th>
                      <th className="text-right py-2 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines?.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="py-3">{line.item_name}</td>
                        <td className="text-right py-3">{line.quantity}</td>
                        <td className="text-right py-3">{formatCurrency(line.price)}</td>
                        <td className="text-right py-3 font-medium">{formatCurrency(line.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Итого:</span>
                    <span className="font-bold text-lg">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-1">Примечание:</h4>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <QrCode className="h-5 w-5" />
                 Kaspi QR
               </CardTitle>
             </CardHeader>
             <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
                  <QRCodeCanvas value={qrUrl} size={200} />
                </div>
                <p className="text-sm text-center text-muted-foreground mb-2">
                  Сканируйте для оплаты
                </p>
                <div className="text-xs text-center text-muted-foreground break-all px-4">
                  <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Ссылка на оплату
                  </a>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
