/**
 * Shared Period Picker Component
 * - Shows all periods with status indicators
 * - Persists selection in URL + localStorage
 * - Defaults to current open period
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LockOpen, AlertTriangle, Lock, Calendar, AlertCircle } from 'lucide-react';
import { usePeriodsManager, type AccountingPeriod } from '@/hooks/usePeriodsManager';
import { formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PeriodPickerProps {
  label?: string;
  showDates?: boolean;
  showStatus?: boolean;
  className?: string;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  open: { label: 'Открыт', icon: LockOpen, class: 'bg-success text-success-foreground' },
  soft_closed: { label: 'Закрыт', icon: AlertTriangle, class: 'bg-warning text-warning-foreground' },
  hard_closed: { label: 'Закрыт', icon: Lock, class: 'bg-destructive text-destructive-foreground' },
};

export function PeriodPicker({
  label = 'Период',
  showDates = false,
  showStatus = true,
  className,
  disabled = false,
}: PeriodPickerProps) {
  const {
    periods,
    selectedPeriodId,
    selectedPeriod,
    isLoading,
    hasPeriods,
    setSelectedPeriodId,
  } = usePeriodsManager();

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!hasPeriods) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-warning bg-warning/10 text-sm">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span>Нет учётных периодов.</span>
          <Link to="/periods" className="underline underline-offset-2 font-medium">
            Создать период
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <Select
        value={selectedPeriodId || ''}
        onValueChange={setSelectedPeriodId}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Выберите период">
            {selectedPeriod && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{selectedPeriod.name}</span>
                {showStatus && selectedPeriod.status !== 'open' && (
                  <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', STATUS_CONFIG[selectedPeriod.status].class)}>
                    {STATUS_CONFIG[selectedPeriod.status].label}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80 z-50 bg-popover">
          {periods.map((period) => {
            const config = STATUS_CONFIG[period.status];
            const StatusIcon = config.icon;
            return (
              <SelectItem key={period.id} value={period.id}>
                <div className="flex items-center gap-3 w-full">
                  <StatusIcon className={cn('h-4 w-4 shrink-0', {
                    'text-success': period.status === 'open',
                    'text-warning': period.status === 'soft_closed',
                    'text-destructive': period.status === 'hard_closed',
                  })} />
                  <div className="flex-1">
                    <div className="font-medium">{period.name}</div>
                    {showDates && (
                      <div className="text-xs text-muted-foreground">
                        {formatDate(period.start_date)} — {formatDate(period.end_date)}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className={cn('text-xs', config.class)}>
                    {config.label}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Inline version for use in cards/headers
 */
export function PeriodPickerInline({
  className,
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const {
    periods,
    selectedPeriodId,
    isLoading,
    hasPeriods,
    setSelectedPeriodId,
  } = usePeriodsManager();

  if (isLoading) {
    return <Skeleton className="h-9 w-48" />;
  }

  if (!hasPeriods) {
    return (
      <Link 
        to="/periods" 
        className="text-sm text-warning hover:underline flex items-center gap-1"
      >
        <AlertCircle className="h-4 w-4" />
        Создать периоды
      </Link>
    );
  }

  return (
    <Select
      value={selectedPeriodId || ''}
      onValueChange={setSelectedPeriodId}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-auto min-w-[180px]', className)}>
        <SelectValue placeholder="Выберите период" />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {periods.map((period) => {
          const config = STATUS_CONFIG[period.status];
          const StatusIcon = config.icon;
          return (
            <SelectItem key={period.id} value={period.id}>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('h-3 w-3', {
                  'text-success': period.status === 'open',
                  'text-warning': period.status === 'soft_closed',
                  'text-destructive': period.status === 'hard_closed',
                })} />
                <span>{period.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Period status display (read-only)
 */
export function PeriodStatusDisplay({ period }: { period: AccountingPeriod | null }) {
  if (!period) return null;

  const config = STATUS_CONFIG[period.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <StatusIcon className={cn('h-4 w-4', {
        'text-success': period.status === 'open',
        'text-warning': period.status === 'soft_closed',
        'text-destructive': period.status === 'hard_closed',
      })} />
      <span className="font-medium">{period.name}</span>
      <Badge className={config.class}>{config.label}</Badge>
    </div>
  );
}
