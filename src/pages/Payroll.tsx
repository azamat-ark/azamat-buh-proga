import { useState, useMemo, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users, 
  Calculator, 
  Info,
  Search,
  Edit2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/constants';
import { 
  calculatePayroll, 
  formatPayrollAmount, 
  getPeriodString,
  getYearFromPeriod,
  getDefaultTaxSettings,
  getDefaultFlags,
  PAYROLL_ACCOUNT_MAPPING_TYPES,
  type TaxSettings,
  type EmployeeDeductionFlags,
  type PayrollCalculation,
} from '@/lib/payroll-calculations';
import { 
  generatePayrollJournalLines, 
  canModifyPeriod,
  type PayrollAccountMappings,
} from '@/lib/accounting-utils';
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
  apply_opv: boolean;
  apply_vosms_employee: boolean;
  apply_vosms_employer: boolean;
  apply_social_tax: boolean;
  apply_social_contributions: boolean;
  apply_standard_deduction: boolean;
}

interface PayrollEntry {
  id: string;
  employee_id: string;
  period: string;
  gross_salary: number;
  opv: number;
  vosms_employee: number;
  ipn: number;
  net_salary: number;
  taxable_income: number;
  standard_deduction: number;
  total_employee_deductions: number;
  total_employer_cost: number;
  social_tax: number;
  social_contributions: number;
  vosms_employer: number;
  worked_hours: number | null;
  worked_days: number | null;
  note: string | null;
  date_paid: string | null;
  employee?: Employee;
  tax_settings_id: string | null;
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
  const [isTaxSettingsDialogOpen, setIsTaxSettingsDialogOpen] = useState(false);
  const [isAccountMappingDialogOpen, setIsAccountMappingDialogOpen] = useState(false);
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
    apply_opv: true,
    apply_vosms_employee: true,
    apply_vosms_employer: true,
    apply_social_tax: true,
    apply_social_contributions: true,
    apply_standard_deduction: true,
  });
  
  // Payroll form state
  const [payrollForm, setPayrollForm] = useState({
    employee_id: '',
    worked_days: '22',
    total_work_days: '22',
    note: '',
  });
  const [payrollPreview, setPayrollPreview] = useState<PayrollCalculation | null>(null);

  // Get year from selected period
  const selectedYear = useMemo(() => getYearFromPeriod(selectedPeriod), [selectedPeriod]);

  // Fetch tax settings for the selected year
  const { data: taxSettings } = useQuery({
    queryKey: ['tax-settings', currentCompany?.id, selectedYear],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', selectedYear)
        .maybeSingle();
      if (error) throw error;
      return data as TaxSettings | null;
    },
    enabled: !!currentCompany?.id,
  });

  // Get effective tax settings (from DB or defaults)
  const effectiveTaxSettings = useMemo(() => {
    if (taxSettings) return taxSettings;
    return { ...getDefaultTaxSettings(selectedYear), id: '' };
  }, [taxSettings, selectedYear]);

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

  // Fetch accounting periods
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

  // Fetch payroll account mappings
  const { data: accountMappings = [] } = useQuery({
    queryKey: ['payroll-account-mappings', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('payroll_account_mappings')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch chart of accounts for mapping
  const { data: chartAccounts = [] } = useQuery({
    queryKey: ['chart-of-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_class')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*');
      if (error) throw error;
      return data;
    },
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

  const periodModifyRules = useMemo(() => 
    canModifyPeriod(currentPeriodStatus as any), 
    [currentPeriodStatus]
  );

  // Get account mappings as object
  const accountMappingsObj = useMemo<PayrollAccountMappings>(() => {
    const obj: any = {};
    for (const mapping of accountMappings) {
      obj[mapping.mapping_type] = mapping.account_id;
    }
    return obj;
  }, [accountMappings]);

  // Check if all required mappings exist
  const missingMappings = useMemo(() => {
    const required = Object.values(PAYROLL_ACCOUNT_MAPPING_TYPES);
    return required.filter(type => !accountMappingsObj[type]);
  }, [accountMappingsObj]);

  // Update form flags when employment type changes
  useEffect(() => {
    if (!editingEmployee) {
      const defaults = getDefaultFlags(employeeForm.employment_type);
      setEmployeeForm(prev => ({
        ...prev,
        apply_opv: defaults.apply_opv,
        apply_vosms_employee: defaults.apply_vosms_employee,
        apply_vosms_employer: defaults.apply_vosms_employer,
        apply_social_tax: defaults.apply_social_tax,
        apply_social_contributions: defaults.apply_social_contributions,
        apply_standard_deduction: defaults.apply_standard_deduction,
      }));
    }
  }, [employeeForm.employment_type, editingEmployee]);

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('No company');
      
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
        apply_opv: employeeForm.apply_opv,
        apply_vosms_employee: employeeForm.apply_vosms_employee,
        apply_vosms_employer: employeeForm.apply_vosms_employer,
        apply_social_tax: employeeForm.apply_social_tax,
        apply_social_contributions: employeeForm.apply_social_contributions,
        apply_standard_deduction: employeeForm.apply_standard_deduction,
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
          apply_opv: employeeForm.apply_opv,
          apply_vosms_employee: employeeForm.apply_vosms_employee,
          apply_vosms_employer: employeeForm.apply_vosms_employer,
          apply_social_tax: employeeForm.apply_social_tax,
          apply_social_contributions: employeeForm.apply_social_contributions,
          apply_standard_deduction: employeeForm.apply_standard_deduction,
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

  // Create payroll entry with journal entry
  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id || !payrollPreview) throw new Error('No data');
      if (!periodModifyRules.canCreate) throw new Error(periodModifyRules.warning);
      
      // Validate account mappings
      if (missingMappings.length > 0) {
        throw new Error('Настройте счета для проводок ЗП');
      }

      // Get payroll document type
      const payrollDocType = documentTypes.find(dt => dt.code === 'PAYROLL');
      if (!payrollDocType) throw new Error('Тип документа PAYROLL не найден');

      // Find matching accounting period
      const [year, month] = selectedPeriod.split('-').map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);
      
      const matchingPeriod = periods.find(p => {
        const pStart = new Date(p.start_date);
        const pEnd = new Date(p.end_date);
        return periodStart >= pStart && periodEnd <= pEnd;
      });

      if (!matchingPeriod) {
        throw new Error('Не найден учётный период для выбранного месяца');
      }

      // Generate journal entry lines
      const { lines, errors } = generatePayrollJournalLines(
        {
          grossSalary: payrollPreview.grossSalary,
          opv: payrollPreview.opv,
          vosmsEmployee: payrollPreview.vosmsEmployee,
          ipn: payrollPreview.ipn,
          netSalary: payrollPreview.netSalary,
          socialTax: payrollPreview.socialTax,
          socialContributions: payrollPreview.socialContributions,
          vosmsEmployer: payrollPreview.vosmsEmployer,
        },
        accountMappingsObj
      );

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Generate entry number
      const entryNumber = `PAY-${selectedPeriod}-${Date.now().toString(36).toUpperCase()}`;
      
      // Calculate last day of month (reuse year/month from line 452)
      const lastDay = new Date(year, month, 0).getDate();
      const entryDate = `${selectedPeriod}-${String(lastDay).padStart(2, '0')}`;

      // Create journal entry first
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: currentCompany.id,
          period_id: matchingPeriod.id,
          document_type_id: payrollDocType.id,
          entry_number: entryNumber,
          date: entryDate,
          description: `Начисление ЗП за ${selectedPeriod}`,
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jeError) throw jeError;

      // Create journal lines
      const journalLines = lines.map((line, idx) => ({
        entry_id: journalEntry.id,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        line_number: idx + 1,
      }));

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(journalLines);
      
      if (linesError) throw linesError;

      // Create payroll entry
      const { error } = await supabase.from('payroll_entries').insert({
        company_id: currentCompany.id,
        employee_id: payrollForm.employee_id,
        period: selectedPeriod,
        period_id: matchingPeriod.id,
        tax_settings_id: taxSettings?.id || null,
        gross_salary: payrollPreview.grossSalary,
        opv: payrollPreview.opv,
        opv_base: payrollPreview.opvBase,
        vosms_employee: payrollPreview.vosmsEmployee,
        ipn: payrollPreview.ipn,
        taxable_income: payrollPreview.taxableIncome,
        standard_deduction: payrollPreview.standardDeduction,
        total_employee_deductions: payrollPreview.totalEmployeeDeductions,
        net_salary: payrollPreview.netSalary,
        social_tax: payrollPreview.socialTax,
        social_tax_base: payrollPreview.socialTaxBase,
        social_contributions: payrollPreview.socialContributions,
        social_contrib_base: payrollPreview.socialContribBase,
        vosms_employer: payrollPreview.vosmsEmployer,
        total_employer_cost: payrollPreview.totalEmployerCost,
        worked_days: parseInt(payrollForm.worked_days) || null,
        note: payrollForm.note || null,
        journal_entry_id: journalEntry.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setIsPayrollDialogOpen(false);
      setPayrollForm({ employee_id: '', worked_days: '22', total_work_days: '22', note: '' });
      setPayrollPreview(null);
      toast({ title: 'Начисление создано с проводкой' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Save tax settings
  const saveTaxSettingsMutation = useMutation({
    mutationFn: async (settings: Omit<TaxSettings, 'id'>) => {
      if (!currentCompany?.id) throw new Error('No company');
      
      const { error } = await supabase
        .from('tax_settings')
        .upsert({
          company_id: currentCompany.id,
          ...settings,
        }, { onConflict: 'company_id,year' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] });
      setIsTaxSettingsDialogOpen(false);
      toast({ title: 'Настройки сохранены' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Save account mapping
  const saveAccountMappingMutation = useMutation({
    mutationFn: async ({ mappingType, accountId }: { mappingType: string; accountId: string }) => {
      if (!currentCompany?.id) throw new Error('No company');
      
      const { error } = await supabase
        .from('payroll_account_mappings')
        .upsert({
          company_id: currentCompany.id,
          mapping_type: mappingType,
          account_id: accountId,
        }, { onConflict: 'company_id,mapping_type' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-account-mappings'] });
      toast({ title: 'Счёт привязан' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Helper functions
  const resetEmployeeForm = () => {
    const defaults = getDefaultFlags('full_time');
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
      ...defaults,
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
      apply_opv: emp.apply_opv,
      apply_vosms_employee: emp.apply_vosms_employee,
      apply_vosms_employer: emp.apply_vosms_employer,
      apply_social_tax: emp.apply_social_tax,
      apply_social_contributions: emp.apply_social_contributions,
      apply_standard_deduction: emp.apply_standard_deduction,
    });
    setIsEmployeeDialogOpen(true);
  };

  // Calculate payroll preview
  const calculatePreview = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      setPayrollPreview(null);
      return;
    }
    
    const grossSalary = employee.salary_type === 'hourly'
      ? employee.hourly_rate * (parseFloat(payrollForm.worked_days) || 0) * 8
      : employee.salary;
    
    const flags: EmployeeDeductionFlags = {
      apply_opv: employee.apply_opv,
      apply_vosms_employee: employee.apply_vosms_employee,
      apply_vosms_employer: employee.apply_vosms_employer,
      apply_social_tax: employee.apply_social_tax,
      apply_social_contributions: employee.apply_social_contributions,
      apply_standard_deduction: employee.apply_standard_deduction,
    };
    
    const calc = calculatePayroll({
      grossSalary,
      isTaxResident: employee.is_tax_resident,
      flags,
      taxSettings: effectiveTaxSettings,
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

  // Payroll totals
  const payrollTotals = useMemo(() => {
    return payrollEntries.reduce(
      (acc, entry) => ({
        gross: acc.gross + (entry.gross_salary || 0),
        net: acc.net + (entry.net_salary || 0),
        opv: acc.opv + (entry.opv || 0),
        ipn: acc.ipn + (entry.ipn || 0),
        socialTax: acc.socialTax + (entry.social_tax || 0),
        socialContrib: acc.socialContrib + (entry.social_contributions || 0),
        vosms: acc.vosms + (entry.vosms_employee || 0) + (entry.vosms_employer || 0),
        employerCost: acc.employerCost + (entry.total_employer_cost || 0),
      }),
      { gross: 0, net: 0, opv: 0, ipn: 0, socialTax: 0, socialContrib: 0, vosms: 0, employerCost: 0 }
    );
  }, [payrollEntries]);

  // Generate period options
  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(getPeriodString(date));
    }
    return options;
  }, []);

  const mappingLabels: Record<string, string> = {
    salary_expense: 'Расходы на ЗП',
    salary_payable: 'Задолженность по ЗП',
    opv_payable: 'ОПВ к уплате',
    vosms_payable: 'ВОСМС к уплате',
    ipn_payable: 'ИПН к уплате',
    social_tax_payable: 'Соц. налог к уплате',
    social_contrib_payable: 'Соц. отчисления к уплате',
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Зарплата и кадры</h1>
          <p className="text-muted-foreground">
            Расчёт заработной платы по законодательству РК
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsTaxSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Ставки {selectedYear}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsAccountMappingDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Счета
          </Button>
        </div>
      </div>

      {/* Tax rates info banner */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Расчётные показатели на {selectedYear} год</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-muted-foreground">
                <span>МРП: {formatCurrency(effectiveTaxSettings.mrp)}</span>
                <span>МЗП: {formatCurrency(effectiveTaxSettings.mzp)}</span>
                <span>ОПВ: {(effectiveTaxSettings.opv_rate * 100).toFixed(1)}%</span>
                <span>ИПН (резидент): {(effectiveTaxSettings.ipn_resident_rate * 100).toFixed(1)}%</span>
                <span>СН: {(effectiveTaxSettings.social_tax_rate * 100).toFixed(1)}%</span>
                <span>СО: {(effectiveTaxSettings.social_contrib_rate * 100).toFixed(1)}%</span>
                <span>Вычет: {effectiveTaxSettings.standard_deduction_mrp} МРП</span>
              </div>
              {!taxSettings && (
                <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                  Используются значения по умолчанию. Нажмите "Ставки {selectedYear}" для настройки.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing mappings warning */}
      {missingMappings.length > 0 && (
        <Card className="mb-6 border-destructive/50 bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Не настроены счета для проводок</p>
                <p className="text-muted-foreground">
                  Нельзя создавать начисления пока не привязаны все счета. 
                  Нажмите "Счета" для настройки.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period lock warning */}
      {!periodModifyRules.canCreate && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">{periodModifyRules.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>ФИО *</Label>
                        <Input
                          value={employeeForm.name}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>ИИН</Label>
                        <Input
                          value={employeeForm.iin}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, iin: e.target.value }))}
                          placeholder="12 цифр"
                          maxLength={12}
                        />
                      </div>
                      <div>
                        <Label>Должность</Label>
                        <Input
                          value={employeeForm.position}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, position: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Тип договора</Label>
                        <Select
                          value={employeeForm.employment_type}
                          onValueChange={(v) => setEmployeeForm(prev => ({ ...prev, employment_type: v as EmploymentType }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Тип оплаты</Label>
                        <Select
                          value={employeeForm.salary_type}
                          onValueChange={(v) => setEmployeeForm(prev => ({ ...prev, salary_type: v as SalaryType }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(SALARY_TYPES).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Оклад (₸)</Label>
                        <Input
                          type="number"
                          value={employeeForm.salary}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, salary: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Ставка в час (₸)</Label>
                        <Input
                          type="number"
                          value={employeeForm.hourly_rate}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Дата приёма</Label>
                        <Input
                          type="date"
                          value={employeeForm.hire_date}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, hire_date: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={employeeForm.is_tax_resident}
                          onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, is_tax_resident: v }))}
                        />
                        <Label>Налоговый резидент РК</Label>
                      </div>
                    </div>

                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-3">Применяемые удержания и взносы</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_opv}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_opv: v }))}
                          />
                          <Label className="text-sm">ОПВ (10%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_vosms_employee}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_vosms_employee: v }))}
                          />
                          <Label className="text-sm">ВОСМС работника (2%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_vosms_employer}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_vosms_employer: v }))}
                          />
                          <Label className="text-sm">ВОСМС работодателя (3%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_social_tax}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_social_tax: v }))}
                          />
                          <Label className="text-sm">Соц. налог (9.5%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_social_contributions}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_social_contributions: v }))}
                          />
                          <Label className="text-sm">Соц. отчисления (3.5%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={employeeForm.apply_standard_deduction}
                            onCheckedChange={(v) => setEmployeeForm(prev => ({ ...prev, apply_standard_deduction: v }))}
                          />
                          <Label className="text-sm">Стандартный вычет (14 МРП)</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
                        {editingEmployee ? 'Сохранить' : 'Добавить'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Оклад</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">
                      {emp.name}
                      {emp.iin && <span className="text-xs text-muted-foreground ml-2">({emp.iin})</span>}
                    </TableCell>
                    <TableCell>{emp.position || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{EMPLOYMENT_TYPES[emp.employment_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(emp.salary)}</TableCell>
                    <TableCell>
                      <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                        {emp.is_active ? 'Активен' : 'Уволен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEditEmployee(emp)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Сотрудники не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {canEdit && periodModifyRules.canCreate && missingMappings.length === 0 && (
              <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать начисление
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Расчёт заработной платы</DialogTitle>
                    <DialogDescription>Период: {selectedPeriod}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Сотрудник</Label>
                        <Select
                          value={payrollForm.employee_id}
                          onValueChange={(v) => {
                            setPayrollForm(prev => ({ ...prev, employee_id: v }));
                            calculatePreview(v);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                          <SelectContent>
                            {employees.filter(e => e.is_active).map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} — {formatCurrency(emp.salary)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Отработано дней</Label>
                        <Input
                          type="number"
                          value={payrollForm.worked_days}
                          onChange={(e) => {
                            setPayrollForm(prev => ({ ...prev, worked_days: e.target.value }));
                            if (payrollForm.employee_id) {
                              setTimeout(() => calculatePreview(payrollForm.employee_id), 0);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Рабочих дней в месяце</Label>
                        <Input
                          type="number"
                          value={payrollForm.total_work_days}
                          onChange={(e) => {
                            setPayrollForm(prev => ({ ...prev, total_work_days: e.target.value }));
                            if (payrollForm.employee_id) {
                              setTimeout(() => calculatePreview(payrollForm.employee_id), 0);
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Примечание</Label>
                        <Textarea
                          value={payrollForm.note}
                          onChange={(e) => setPayrollForm(prev => ({ ...prev, note: e.target.value }))}
                        />
                      </div>
                    </div>

                    {payrollPreview && (
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Расчёт</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Gross (начислено)</p>
                              <p className="text-xl font-bold">{formatPayrollAmount(payrollPreview.grossSalary)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Net (к выплате)</p>
                              <p className="text-xl font-bold text-green-600">{formatPayrollAmount(payrollPreview.netSalary)}</p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h5 className="font-medium mb-2">Удержания с работника</h5>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">ОПВ ({(payrollPreview.ratesUsed.opvRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.opv)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">ВОСМС ({(payrollPreview.ratesUsed.vosmsEmployeeRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.vosmsEmployee)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">ИПН ({(payrollPreview.ratesUsed.ipnRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.ipn)}</p>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Итого удержано: <strong>{formatPayrollAmount(payrollPreview.totalEmployeeDeductions)}</strong>
                            </p>
                          </div>

                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            <p>Налогооблагаемый доход = {formatPayrollAmount(payrollPreview.grossSalary)} − {formatPayrollAmount(payrollPreview.opv)} (ОПВ) − {formatPayrollAmount(payrollPreview.standardDeduction)} (вычет {payrollPreview.ratesUsed.standardDeductionMrp} МРП)</p>
                            <p>= {formatPayrollAmount(payrollPreview.taxableIncome)}</p>
                            <p>ИПН = {formatPayrollAmount(payrollPreview.taxableIncome)} × {(payrollPreview.ratesUsed.ipnRate * 100).toFixed(1)}% = {formatPayrollAmount(payrollPreview.ipn)}</p>
                          </div>

                          <Separator />

                          <div>
                            <h5 className="font-medium mb-2">Расходы работодателя</h5>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Соц. налог ({(payrollPreview.ratesUsed.socialTaxRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.socialTax)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Соц. отчисления ({(payrollPreview.ratesUsed.socialContribRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.socialContributions)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">ВОСМС ({(payrollPreview.ratesUsed.vosmsEmployerRate * 100).toFixed(1)}%)</p>
                                <p>{formatPayrollAmount(payrollPreview.vosmsEmployer)}</p>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Полная стоимость работодателю: <strong>{formatPayrollAmount(payrollPreview.totalEmployerCost)}</strong>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button
                        onClick={() => createPayrollMutation.mutate()}
                        disabled={!payrollPreview || createPayrollMutation.isPending}
                      >
                        Создать начисление
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Начислено (Gross)</p>
                <p className="text-2xl font-bold">{formatCurrency(payrollTotals.gross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">К выплате (Net)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(payrollTotals.net)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Налоги и взносы</p>
                <p className="text-2xl font-bold">{formatCurrency(payrollTotals.opv + payrollTotals.ipn + payrollTotals.vosms)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Полная стоимость</p>
                <p className="text-2xl font-bold">{formatCurrency(payrollTotals.employerCost)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">ОПВ</TableHead>
                  <TableHead className="text-right">ИПН</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Стоимость</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.employee?.name || '—'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.gross_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.opv)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.ipn)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(entry.net_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.total_employer_cost)}</TableCell>
                  </TableRow>
                ))}
                {payrollEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Нет начислений за {selectedPeriod}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tax Settings Dialog */}
      <Dialog open={isTaxSettingsDialogOpen} onOpenChange={setIsTaxSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Налоговые ставки {selectedYear}</DialogTitle>
            <DialogDescription>Настройте расчётные показатели для данного года</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              saveTaxSettingsMutation.mutate({
                year: selectedYear,
                mrp: parseInt(formData.get('mrp') as string) || 3692,
                mzp: parseInt(formData.get('mzp') as string) || 85000,
                opv_rate: parseFloat(formData.get('opv_rate') as string) || 0.10,
                opv_cap_mzp: parseInt(formData.get('opv_cap_mzp') as string) || 50,
                vosms_employee_rate: parseFloat(formData.get('vosms_employee_rate') as string) || 0.02,
                vosms_employer_rate: parseFloat(formData.get('vosms_employer_rate') as string) || 0.03,
                ipn_resident_rate: parseFloat(formData.get('ipn_resident_rate') as string) || 0.10,
                ipn_nonresident_rate: parseFloat(formData.get('ipn_nonresident_rate') as string) || 0.20,
                standard_deduction_mrp: parseInt(formData.get('standard_deduction_mrp') as string) || 14,
                social_tax_rate: parseFloat(formData.get('social_tax_rate') as string) || 0.095,
                social_contrib_rate: parseFloat(formData.get('social_contrib_rate') as string) || 0.035,
                social_contrib_min_mzp: parseInt(formData.get('social_contrib_min_mzp') as string) || 1,
                social_contrib_max_mzp: parseInt(formData.get('social_contrib_max_mzp') as string) || 7,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>МРП (₸)</Label>
                <Input name="mrp" type="number" defaultValue={effectiveTaxSettings.mrp} />
              </div>
              <div>
                <Label>МЗП (₸)</Label>
                <Input name="mzp" type="number" defaultValue={effectiveTaxSettings.mzp} />
              </div>
              <div>
                <Label>ОПВ ставка</Label>
                <Input name="opv_rate" type="number" step="0.01" defaultValue={effectiveTaxSettings.opv_rate} />
              </div>
              <div>
                <Label>ОПВ лимит (МЗП)</Label>
                <Input name="opv_cap_mzp" type="number" defaultValue={effectiveTaxSettings.opv_cap_mzp} />
              </div>
              <div>
                <Label>ВОСМС работника</Label>
                <Input name="vosms_employee_rate" type="number" step="0.01" defaultValue={effectiveTaxSettings.vosms_employee_rate} />
              </div>
              <div>
                <Label>ВОСМС работодателя</Label>
                <Input name="vosms_employer_rate" type="number" step="0.01" defaultValue={effectiveTaxSettings.vosms_employer_rate} />
              </div>
              <div>
                <Label>ИПН резидент</Label>
                <Input name="ipn_resident_rate" type="number" step="0.01" defaultValue={effectiveTaxSettings.ipn_resident_rate} />
              </div>
              <div>
                <Label>ИПН нерезидент</Label>
                <Input name="ipn_nonresident_rate" type="number" step="0.01" defaultValue={effectiveTaxSettings.ipn_nonresident_rate} />
              </div>
              <div>
                <Label>Вычет (МРП)</Label>
                <Input name="standard_deduction_mrp" type="number" defaultValue={effectiveTaxSettings.standard_deduction_mrp} />
              </div>
              <div>
                <Label>Соц. налог</Label>
                <Input name="social_tax_rate" type="number" step="0.001" defaultValue={effectiveTaxSettings.social_tax_rate} />
              </div>
              <div>
                <Label>Соц. отчисления</Label>
                <Input name="social_contrib_rate" type="number" step="0.001" defaultValue={effectiveTaxSettings.social_contrib_rate} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTaxSettingsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saveTaxSettingsMutation.isPending}>
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Mapping Dialog */}
      <Dialog open={isAccountMappingDialogOpen} onOpenChange={setIsAccountMappingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Счета для проводок ЗП</DialogTitle>
            <DialogDescription>Привяжите счета из плана счетов для автоматического создания проводок</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(PAYROLL_ACCOUNT_MAPPING_TYPES).map(([key, type]) => (
              <div key={type} className="flex items-center gap-4">
                <Label className="w-40 flex-shrink-0">{mappingLabels[type]}</Label>
                <Select
                  value={accountMappingsObj[type] || ''}
                  onValueChange={(v) => saveAccountMappingMutation.mutate({ mappingType: type, accountId: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {chartAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} — {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsAccountMappingDialogOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
