import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { LayoutDashboard, ArrowRightLeft, FileText, Users, Package, FolderOpen, Wallet, BarChart3, Settings, LogOut, Building2, Calculator, ChevronDown, CreditCard, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLES } from '@/lib/constants';
const mainNav = [{
  href: '/dashboard',
  icon: LayoutDashboard,
  label: 'Дашборд'
}, {
  href: '/transactions',
  icon: ArrowRightLeft,
  label: 'Операции'
}, {
  href: '/invoices',
  icon: FileText,
  label: 'Документы'
}];
const accountingNav = [{
  href: '/chart-of-accounts',
  icon: FolderOpen,
  label: 'План счетов'
}, {
  href: '/journal',
  icon: FileText,
  label: 'Журнал проводок'
}, {
  href: '/periods',
  icon: Calculator,
  label: 'Периоды'
}];
const directoryNav = [{
  href: '/counterparties',
  icon: Users,
  label: 'Контрагенты'
}, {
  href: '/items',
  icon: Package,
  label: 'Товары/услуги'
}, {
  href: '/categories',
  icon: FolderOpen,
  label: 'Категории'
}, {
  href: '/accounts',
  icon: CreditCard,
  label: 'Счета/кассы'
}];
const financeNav = [{
  href: '/payroll',
  icon: Wallet,
  label: 'Зарплата'
}];

const reportsNav = [{
  href: '/reports',
  icon: BarChart3,
  label: 'Все отчёты'
}, {
  href: '/reports/trial-balance',
  icon: Calculator,
  label: 'Оборотная ведомость'
}, {
  href: '/reports/balance-sheet',
  icon: FileText,
  label: 'Баланс'
}, {
  href: '/reports/profit-loss',
  icon: BarChart3,
  label: 'ОПУ'
}, {
  href: '/reports/vat',
  icon: Calculator,
  label: 'НДС отчёт'
}];
interface SidebarProps {
  className?: string;
}
export function Sidebar({
  className
}: SidebarProps) {
  const location = useLocation();
  const {
    user,
    signOut
  } = useAuth();
  const {
    currentCompany,
    companies,
    setCurrentCompany,
    userRole
  } = useCompany();
  const NavLink = ({
    href,
    icon: Icon,
    label
  }: {
    href: string;
    icon: any;
    label: string;
  }) => {
    const isActive = location.pathname === href;
    return <Link to={href} className={cn('sidebar-item', isActive && 'sidebar-item-active')}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>;
  };
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const roleInfo = userRole ? ROLES[userRole] : null;
  return <aside className={cn('flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
          <Calculator className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-sidebar-foreground">Азамат Accounting</span>
      </div>

      {/* Company Selector */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{currentCompany?.name || 'Выберите организацию'}</span>
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {companies.map(company => <DropdownMenuItem key={company.id} onClick={() => setCurrentCompany(company)} className={cn(currentCompany?.id === company.id && 'bg-accent')}>
                <Building2 className="mr-2 h-4 w-4" />
                {company.name}
              </DropdownMenuItem>)}
            {companies.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild>
              <Link to="/onboarding">
                <span className="text-primary">+ Добавить организацию</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {roleInfo && <div className={cn('mt-2 px-3 py-1 rounded-md text-xs font-medium text-center', roleInfo.color, 'text-primary-foreground')}>
            {roleInfo.label}
          </div>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {mainNav.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Учёт
          </p>
          <div className="space-y-1">
            {accountingNav.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>

        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Справочники
          </p>
          <div className="space-y-1">
            {directoryNav.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>

        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Финансы
          </p>
          <div className="space-y-1">
            {financeNav.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>

        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Отчёты
          </p>
          <div className="space-y-1">
            {reportsNav.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>

        <div className="mt-6">
          <NavLink href="/settings" icon={Settings} label="Настройки" />
          <NavLink href="/security" icon={Settings} label="Безопасность" />
        </div>
      </nav>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Профиль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>;
}