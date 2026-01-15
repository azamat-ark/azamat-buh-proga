import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users, 
  Calculator, 
  FileText, 
  Wallet, 
  Info,
  Search,
  Edit2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/constants';
import { 
  calculatePayroll, 
  formatPayrollAmount, 
  getPeriodString,
  MRP_2024,
  MZP_2024,
  TAX_RATES,
  type PayrollCalculation,
} from '@/lib/payroll-calculations';
import { cn } from '@/lib/utils';

type EmploymentType = 'full_time' | 'contractor';
type SalaryType = 'monthly' | 'hourly';

interface Employee {
  id: string;
  name: string;
  iin: string | null;
  position: string | null;
  salary: number;
  hourly_rate: number;
  employment_type: EmploymentType;
  salary_type: SalaryType;
  is_tax_resident: boolean;
  is_active: boolean;
  hire_date: string | null;
  termination_date: string | null;
}

interface PayrollEntry {
  id: string;
  employee_id: string;
  period: string;
  gross_salary: number;
  opv: number;
  vosms_employee: number;
  ipn: number;
  accrued: number;
  paid: number;
  social_tax: number;
  social_contributions: number;
  vosms_employer: number;
  worked_hours: number | null;
  worked_days: number | null;
  note: string | null;
  date_paid: string | null;
  employee?: Employee;
}

const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  full_time: 'Штатный сотрудник',
  contractor: 'Договор ГПХ',
};

const SALARY_TYPES: Record<SalaryType, string> = {
  monthly: 'Оклад',
  hourly: 'Почасовая',
};

export default function Payroll() {
  const { currentCompany, canEdit } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('employees');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => getPeriodString(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    iin: '',
    position: '',
    salary: '',
    hourly_rate: '',
    employment_type: 'full_time' as EmploymentType,
    salary_type: 'monthly' as SalaryType,
    is_tax_resident: true,
    hire_date: new Date().toISOString().split('T')[0],
  });
  
  // Payroll form state
  const [payrollForm, setPayrollForm] = useState({
    employee_id: '',
    worked_days: '22',
    total_work_days: '22',
    note: '',
  });
  const [payrollPreview, setPayrollPreview] = useState<PayrollCalculation | null>(null);

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch payroll entries for selected period
  const { data: payrollEntries = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll-entries', currentCompany?.id, selectedPeriod],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('payroll_entries')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('company_id', currentCompany.id)
        .eq('period', selectedPeriod)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PayrollEntry[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch accounting periods to check if payroll can be edited
  const { data: periods = [] } = useQuery({
    queryKey: ['accounting-periods', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Get current period status
  const currentPeriodStatus = useMemo(() => {
    const [year, month] = selectedPeriod.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    
    const matchingPeriod = periods.find(p => {
      const pStart = new Date(p.start_date);
      const pEnd = new Date(p.end_date);
      return periodStart >= pStart && periodEnd <= pEnd;
    });
    
    return matchingPeriod?.status || 'open';
  }, [periods, selectedPeriod]);

  const isPeriodLocked = currentPeriodStatus === 'hard_closed';

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('No company');
      
      // Validate IIN (12 digits)
      if (employeeForm.iin && !/^\d{12}$/.test(employeeForm.iin)) {
        throw new Error('ИИН должен содержать 12 цифр');
      }
      
      const { error } = await supabase.from('employees').insert({
        company_id: currentCompany.id,
        name: employeeForm.name.trim(),
        iin: employeeForm.iin || null,
        position: employeeForm.position || null,
        salary: parseFloat(employeeForm.salary) || 0,
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 0,
        employment_type: employeeForm.employment_type,
        salary_type: employeeForm.salary_type,
        is_tax_resident: employeeForm.is_tax_resident,
        hire_date: employeeForm.hire_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEmployeeDialogOpen(false);
      resetEmployeeForm();
      toast({ title: 'Сотрудник добавлен' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!editingEmployee) throw new Error('No employee selected');
      
      if (employeeForm.iin && !/^\d{12}$/.test(employeeForm.iin)) {
        throw new Error('ИИН должен содержать 12 цифр');
      }
      
      const { error } = await supabase
        .from('employees')
        .update({
          name: employeeForm.name.trim(),
          iin: employeeForm.iin || null,
          position: employeeForm.position || null,
          salary: parseFloat(employeeForm.salary) || 0,
          hourly_rate: parseFloat(employeeForm.hourly_rate) || 0,
          employment_type: employeeForm.employment_type,
          salary_type: employeeForm.salary_type,
          is_tax_resident: employeeForm.is_tax_resident,
          hire_date: employeeForm.hire_date || null,
        })
        .eq('id', editingEmployee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      toast({ title: 'Данные обновлены' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Create payroll entry mutation
  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id || !payrollPreview) throw new Error('No data');
      if (isPeriodLocked) throw new Error('Период закрыт для изменений');
      
      const { error } = await supabase.from('payroll_entries').insert({
        company_id: currentCompany.id,
        employee_id: payrollForm.employee_id,
        period: selectedPeriod,
        gross_salary: payrollPreview.grossSalary,
        opv: payrollPreview.opv,
        vosms_employee: payrollPreview.vosmsEmployee,
        ipn: payrollPreview.ipn,
        accrued: payrollPreview.netSalary,
        paid: 0,
        social_tax: payrollPreview.socialTax,
        social_contributions: payrollPreview.socialContributions,
        vosms_employer: payrollPreview.vosmsEmployer,
        worked_days: parseInt(payrollForm.worked_days) || null,
        note: payrollForm.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      setIsPayrollDialogOpen(false);
      setPayrollForm({ employee_id: '', worked_days: '22', total_work_days: '22', note: '' });
      setPayrollPreview(null);
      toast({ title: 'Начисление создано' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Helper functions
  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      iin: '',
      position: '',
      salary: '',
      hourly_rate: '',
      employment_type: 'full_time',
      salary_type: 'monthly',
      is_tax_resident: true,
      hire_date: new Date().toISOString().split('T')[0],
    });
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      iin: emp.iin || '',
      position: emp.position || '',
      salary: String(emp.salary || ''),
      hourly_rate: String(emp.hourly_rate || ''),
      employment_type: emp.employment_type,
      salary_type: emp.salary_type,
      is_tax_resident: emp.is_tax_resident,
      hire_date: emp.hire_date || '',
    });
    setIsEmployeeDialogOpen(true);
  };

  // Calculate payroll preview when employee is selected
  const calculatePreview = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      setPayrollPreview(null);
      return;
    }
    
    const grossSalary = employee.salary_type === 'hourly'
      ? employee.hourly_rate * (parseFloat(payrollForm.worked_days) || 0) * 8
      : employee.salary;
    
    const calc = calculatePayroll({
      grossSalary,
      employmentType: employee.employment_type,
      isTaxResident: employee.is_tax_resident,
      workedDays: parseInt(payrollForm.worked_days),
      totalWorkDays: parseInt(payrollForm.total_work_days),
    });
    
    setPayrollPreview(calc);
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.iin?.includes(searchTerm) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = employees.filter(e => e.is_active);

  // Payroll totals
  const payrollTotals = useMemo(() => {
    return payrollEntries.reduce(
      (acc, entry) => ({
        gross: acc.gross + (entry.gross_salary || 0),
        net: acc.net + (entry.accrued || 0),
        opv: acc.opv + (entry.opv || 0),
        ipn: acc.ipn + (entry.ipn || 0),
        socialTax: acc.socialTax + (entry.social_tax || 0),
        socialContrib: acc.socialContrib + (entry.social_contributions || 0),
        vosms: acc.vosms + (entry.vosms_employee || 0) + (entry.vosms_employer || 0),
      }),
      { gross: 0, net: 0, opv: 0, ipn: 0, socialTax: 0, socialContrib: 0, vosms: 0 }
    );
  }, [payrollEntries]);

  // Generate period options (last 12 months)
  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(getPeriodString(date));
    }
    return options;
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Зарплата и кадры</h1>
          <p className="text-muted-foreground">
            Расчёт заработной платы по законодательству РК
          </p>
        </div>
      </div>

      {/* Info banner */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Расчётные показатели на 2024 год</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-muted-foreground">
                <span>МРП: {formatCurrency(MRP_2024)}</span>
                <span>МЗП: {formatCurrency(MZP_2024)}</span>
                <span>ОПВ: {TAX_RATES.OPV * 100}%</span>
                <span>ИПН: {TAX_RATES.IPN * 100}%</span>
                <span>СН: {TAX_RATES.SOCIAL_TAX * 100}%</span>
                <span>СО: {TAX_RATES.SOCIAL_CONTRIBUTIONS * 100}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Сотрудники
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <Calculator className="h-4 w-4" />
            Начисления
          </TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, ИИН, должности..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canEdit && (
              <Dialog 
                open={isEmployeeDialogOpen} 
                onOpenChange={(open) => {
                  setIsEmployeeDialogOpen(open);
                  if (!open) {
                    setEditingEmployee(null);
                    resetEmployeeForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить сотрудника
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                    </DialogTitle>
                    <DialogDescription>
                      Данные для расчёта заработной платы
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingEmployee) {
                        updateEmployeeMutation.mutate();
                      } else {
                        createEmployeeMutation.mutate();
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="input-group">
                      <Label>ФИО *</Label>
                      <Input
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group">
                        <Label className="flex items-center gap-1">
                          ИИН
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                12-значный идентификационный номер
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          value={employeeForm.iin}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, iin: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                          placeholder="123456789012"
                          maxLength={12}
                        />
                      </div>
                      <div className="input-group">
                        <Label>Должность</Label>
                        <Input
                          value={employeeForm.position}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                          placeholder="Бухгалтер"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group">
                        <Label>Тип занятости</Label>
                        <Select
                          value={employeeForm.employment_type}
                          onValueChange={(v) => setEmployeeForm({ ...employeeForm, employment_type: v as EmploymentType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EMPLOYMENT_TYPES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="input-group">
                        <Label>Тип оплаты</Label>
                        <Select
                          value={employeeForm.salary_type}
                          onValueChange={(v) => setEmployeeForm({ ...employeeForm, salary_type: v as SalaryType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SALARY_TYPES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group">
                        <Label>
                          {employeeForm.salary_type === 'hourly' ? 'Часовая ставка (₸)' : 'Оклад (₸)'}
                        </Label>
                        <Input
                          type="number"
                          value={employeeForm.salary_type === 'hourly' ? employeeForm.hourly_rate : employeeForm.salary}
                          onChange={(e) => {
                            if (employeeForm.salary_type === 'hourly') {
                              setEmployeeForm({ ...employeeForm, hourly_rate: e.target.value });
                            } else {
                              setEmployeeForm({ ...employeeForm, salary: e.target.value });
                            }
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="input-group">
                        <Label>Дата приёма</Label>
                        <Input
                          type="date"
                          value={employeeForm.hire_date}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="tax_resident"
                        checked={employeeForm.is_tax_resident}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, is_tax_resident: e.target.checked })}
                        className="rounded border-input"
                      />
                      <Label htmlFor="tax_resident">Налоговый резидент РК</Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                    >
                      {editingEmployee ? 'Сохранить изменения' : 'Добавить сотрудника'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {filteredEmployees.length === 0 ? (
                <div className="empty-state py-16">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Нет сотрудников</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>ИИН</TableHead>
                      <TableHead>Должность</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead className="text-right">Оклад/Ставка</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="font-mono text-sm">{emp.iin || '—'}</TableCell>
                        <TableCell>{emp.position || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EMPLOYMENT_TYPES[emp.employment_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.salary_type === 'hourly' 
                            ? `${formatCurrency(emp.hourly_rate)}/час`
                            : formatCurrency(emp.salary)
                          }
                        </TableCell>
                        <TableCell>
                          {emp.is_active ? (
                            <Badge className="bg-success text-success-foreground">Активен</Badge>
                          ) : (
                            <Badge variant="secondary">Уволен</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditEmployee(emp)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="input-group w-48">
              <Label>Период</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2 ml-auto">
              {isPeriodLocked && (
                <Badge variant="destructive" className="mb-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Период закрыт
                </Badge>
              )}
              {canEdit && !isPeriodLocked && (
                <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Начислить зарплату
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Начисление заработной платы</DialogTitle>
                      <DialogDescription>
                        Период: {selectedPeriod}
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        createPayrollMutation.mutate();
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="input-group">
                          <Label>Сотрудник *</Label>
                          <Select
                            value={payrollForm.employee_id}
                            onValueChange={(v) => {
                              setPayrollForm({ ...payrollForm, employee_id: v });
                              calculatePreview(v);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите сотрудника" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name} — {formatCurrency(emp.salary)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="input-group">
                            <Label>Отработано дней</Label>
                            <Input
                              type="number"
                              value={payrollForm.worked_days}
                              onChange={(e) => {
                                setPayrollForm({ ...payrollForm, worked_days: e.target.value });
                                if (payrollForm.employee_id) {
                                  setTimeout(() => calculatePreview(payrollForm.employee_id), 0);
                                }
                              }}
                            />
                          </div>
                          <div className="input-group">
                            <Label>Всего дней</Label>
                            <Input
                              type="number"
                              value={payrollForm.total_work_days}
                              onChange={(e) => {
                                setPayrollForm({ ...payrollForm, total_work_days: e.target.value });
                                if (payrollForm.employee_id) {
                                  setTimeout(() => calculatePreview(payrollForm.employee_id), 0);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Calculation Preview */}
                      {payrollPreview && (
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Расчёт</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between font-medium">
                              <span>Начислено (gross)</span>
                              <span>{formatPayrollAmount(payrollPreview.grossSalary)}</span>
                            </div>
                            
                            <div className="border-t pt-2">
                              <p className="text-xs text-muted-foreground mb-1">Удержания с работника:</p>
                              <div className="space-y-1 pl-2">
                                <div className="flex justify-between">
                                  <span>ОПВ (10%)</span>
                                  <span className="text-destructive">−{formatPayrollAmount(payrollPreview.opv)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ВОСМС (2%)</span>
                                  <span className="text-destructive">−{formatPayrollAmount(payrollPreview.vosmsEmployee)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ИПН (10%)</span>
                                  <span className="text-destructive">−{formatPayrollAmount(payrollPreview.ipn)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between font-bold text-base border-t pt-2">
                              <span>К выплате (net)</span>
                              <span className="text-success">{formatPayrollAmount(payrollPreview.netSalary)}</span>
                            </div>
                            
                            <div className="border-t pt-2">
                              <p className="text-xs text-muted-foreground mb-1">Взносы работодателя (сверх зарплаты):</p>
                              <div className="space-y-1 pl-2">
                                <div className="flex justify-between">
                                  <span>Социальный налог</span>
                                  <span>{formatPayrollAmount(payrollPreview.socialTax)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Соц. отчисления (3.5%)</span>
                                  <span>{formatPayrollAmount(payrollPreview.socialContributions)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ВОСМС работодателя (3%)</span>
                                  <span>{formatPayrollAmount(payrollPreview.vosmsEmployer)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between font-medium border-t pt-2">
                              <span>Итого затраты работодателя</span>
                              <span>{formatPayrollAmount(payrollPreview.totalEmployerCost)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="input-group">
                        <Label>Примечание</Label>
                        <Textarea
                          value={payrollForm.note}
                          onChange={(e) => setPayrollForm({ ...payrollForm, note: e.target.value })}
                          placeholder="Комментарий к начислению"
                          rows={2}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={!payrollPreview || createPayrollMutation.isPending}
                      >
                        Создать начисление
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Summary cards */}
          {payrollEntries.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Начислено (gross)</div>
                  <div className="text-2xl font-bold">{formatCurrency(payrollTotals.gross)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">К выплате (net)</div>
                  <div className="text-2xl font-bold text-success">{formatCurrency(payrollTotals.net)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Налоги (ОПВ+ИПН+ВОСМС)</div>
                  <div className="text-2xl font-bold text-destructive">
                    {formatCurrency(payrollTotals.opv + payrollTotals.ipn + payrollTotals.vosms)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Взносы работодателя</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(payrollTotals.socialTax + payrollTotals.socialContrib)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {payrollEntries.length === 0 ? (
                <div className="empty-state py-16">
                  <Wallet className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Нет начислений за {selectedPeriod}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Сотрудник</TableHead>
                      <TableHead className="text-right">Начислено</TableHead>
                      <TableHead className="text-right">ОПВ</TableHead>
                      <TableHead className="text-right">ВОСМС</TableHead>
                      <TableHead className="text-right">ИПН</TableHead>
                      <TableHead className="text-right">К выплате</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.employee?.name || 'Неизвестно'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.gross_salary)}</TableCell>
                        <TableCell className="text-right text-destructive">−{formatCurrency(entry.opv)}</TableCell>
                        <TableCell className="text-right text-destructive">−{formatCurrency(entry.vosms_employee)}</TableCell>
                        <TableCell className="text-right text-destructive">−{formatCurrency(entry.ipn)}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(entry.accrued)}
                        </TableCell>
                        <TableCell>
                          {entry.paid >= entry.accrued ? (
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Выплачено
                            </Badge>
                          ) : entry.paid > 0 ? (
                            <Badge variant="secondary">Частично</Badge>
                          ) : (
                            <Badge variant="outline">Не выплачено</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
