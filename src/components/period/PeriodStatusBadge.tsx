/**
 * Period status indicator badge
 */

import { Badge } from '@/components/ui/badge';
import { Lock, LockOpen, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodStatusBadgeProps {
  status: 'open' | 'soft_closed' | 'hard_closed' | null;
  periodName?: string | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  open: {
    label: 'Открыт',
    icon: LockOpen,
    className: 'bg-success/10 text-success border-success/20',
  },
  soft_closed: {
    label: 'Мягко закрыт',
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  hard_closed: {
    label: 'Закрыт',
    icon: Lock,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function PeriodStatusBadge({
  status,
  periodName,
  showLabel = true,
  size = 'md',
}: PeriodStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
        <HelpCircle className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        {showLabel && 'Период не выбран'}
      </Badge>
    );
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        size === 'sm' && 'text-xs py-0.5 px-1.5'
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {showLabel && (
        <span>
          {periodName && `${periodName}: `}
          {config.label}
        </span>
      )}
    </Badge>
  );
}
