/**
 * Alert component showing period validation status
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodValidationAlertProps {
  isValid: boolean;
  canWrite: boolean;
  error: string | null;
  periodName: string | null;
  status: 'open' | 'soft_closed' | 'hard_closed' | null;
  isValidating?: boolean;
  className?: string;
}

export function PeriodValidationAlert({
  isValid,
  canWrite,
  error,
  periodName,
  status,
  isValidating = false,
  className,
}: PeriodValidationAlertProps) {
  if (isValidating) {
    return (
      <Alert className={cn('border-muted', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Проверка периода...</AlertDescription>
      </Alert>
    );
  }

  if (!isValid && error) {
    const showPeriodsLink = error.includes('Нет учётного периода') || error.includes('Создайте период');
    
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка периода</AlertTitle>
        <AlertDescription>
          {error}
          {showPeriodsLink && (
            <>
              {' '}
              <Link to="/periods" className="underline font-medium hover:no-underline">
                Перейти к периодам →
              </Link>
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isValid && !canWrite) {
    return (
      <Alert className={cn('border-warning bg-warning/10', className)}>
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Период закрыт</AlertTitle>
        <AlertDescription>
          Период "{periodName}" {status === 'soft_closed' ? 'закрыт (мягко)' : 'закрыт окончательно'}.{' '}
          Для внесения изменений откройте период в разделе{' '}
          <Link to="/periods" className="underline font-medium hover:no-underline">
            Периоды
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  if (isValid && canWrite && periodName) {
    return (
      <Alert className={cn('border-success/30 bg-success/5', className)}>
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          Период "{periodName}" открыт для операций
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
