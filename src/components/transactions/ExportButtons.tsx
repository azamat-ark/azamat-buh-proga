import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF, transactionExportColumns } from '@/lib/export-utils';
import { formatDate } from '@/lib/constants';

interface ExportButtonsProps {
  data: any[];
  filenamePrefix?: string;
  title?: string;
}

export function ExportButtons({ data, filenamePrefix = 'export', title }: ExportButtonsProps) {
  const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}`;

  const handleExportCSV = () => {
    exportToCSV(data, transactionExportColumns, filename);
  };

  const handleExportPDF = () => {
    exportToPDF(data, transactionExportColumns, filename, title);
  };

  if (data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Скачать CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Скачать PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
