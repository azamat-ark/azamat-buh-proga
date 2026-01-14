import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calculator,
  FileText,
  Users,
  TrendingUp,
  Shield,
  Smartphone,
  Check,
  ArrowRight,
  BarChart3,
  Receipt,
  Wallet,
  Building2,
} from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Учёт доходов и расходов',
    description: 'Ведите операции по счетам, категориям и контрагентам. Импортируйте данные из CSV.',
  },
  {
    icon: FileText,
    title: 'Счета и документы',
    description: 'Создавайте счета на оплату, акты и накладные. Отслеживайте статусы и оплаты.',
  },
  {
    icon: Users,
    title: 'Работа с контрагентами',
    description: 'База клиентов и поставщиков с историей операций и документов.',
  },
  {
    icon: TrendingUp,
    title: 'Отчёты и аналитика',
    description: 'P&L, движение денежных средств, отчёты по контрагентам. Экспорт в PDF и CSV.',
  },
  {
    icon: Wallet,
    title: 'Расчёт зарплаты',
    description: 'Учёт сотрудников, начислений и выплат. Простой зарплатный модуль.',
  },
  {
    icon: Shield,
    title: 'Безопасность данных',
    description: 'Изоляция данных по организациям. Роли и права доступа для команды.',
  },
];

const plans = [
  {
    name: 'Старт',
    price: '0',
    description: 'Для начинающих',
    features: [
      '1 организация',
      '100 операций в месяц',
      '2 пользователя',
      'Базовые отчёты',
    ],
    popular: false,
  },
  {
    name: 'Бизнес',
    price: '9 990',
    description: 'Для малого бизнеса',
    features: [
      '5 организаций',
      'Без ограничений операций',
      '10 пользователей',
      'Все отчёты',
      'Экспорт в PDF',
      'Приоритетная поддержка',
    ],
    popular: true,
  },
  {
    name: 'Про',
    price: '29 990',
    description: 'Для растущих компаний',
    features: [
      'Без ограничений организаций',
      'Без ограничений операций',
      'Без ограничений пользователей',
      'API интеграции',
      'Брендирование документов',
      'Персональный менеджер',
    ],
    popular: false,
  },
];

const faqs = [
  {
    question: 'Что такое БухОнлайн?',
    answer:
      'БухОнлайн — это облачный сервис для ведения финансового учёта малого бизнеса. Вы можете учитывать доходы и расходы, выставлять счета, вести справочники контрагентов и получать отчёты.',
  },
  {
    question: 'Подходит ли сервис для ИП?',
    answer:
      'Да, сервис подходит для индивидуальных предпринимателей, ТОО и других форм бизнеса в Казахстане и СНГ.',
  },
  {
    question: 'Как импортировать данные из другой системы?',
    answer:
      'Вы можете импортировать операции через CSV-файл. Скачайте шаблон, заполните его и загрузите в систему.',
  },
  {
    question: 'Можно ли работать с несколькими организациями?',
    answer:
      'Да, в тарифах Бизнес и Про вы можете вести учёт нескольких организаций и переключаться между ними.',
  },
  {
    question: 'Как пригласить бухгалтера?',
    answer:
      'В настройках организации отправьте приглашение по email. Бухгалтер получит доступ к учёту без возможности управлять тарифом.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">БухОнлайн</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Возможности
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Тарифы
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button>Начать бесплатно</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl animate-fade-in">
              Онлайн-бухгалтерия
              <br />
              <span className="text-primary">для малого бизнеса</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl animate-slide-up">
              Ведите учёт доходов и расходов, выставляйте счета, контролируйте финансы — всё в одном месте.
              Простой и понятный сервис для предпринимателей.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gap-2">
                  Попробовать бесплатно
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  Узнать больше
                </Button>
              </a>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 mx-auto max-w-5xl animate-fade-in">
            <div className="relative rounded-xl border bg-card p-2 shadow-lg">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl opacity-50" />
              <div className="relative rounded-lg bg-muted/30 p-4 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Доходы', value: '2 450 000 ₸', icon: TrendingUp, positive: true },
                    { label: 'Расходы', value: '1 280 000 ₸', icon: Receipt, positive: false },
                    { label: 'Прибыль', value: '1 170 000 ₸', icon: BarChart3, positive: true },
                    { label: 'Счета', value: '12', icon: FileText, positive: true },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-lg bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <stat.icon className="h-4 w-4" />
                        {stat.label}
                      </div>
                      <div className={`mt-1 text-lg font-semibold ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-32 rounded-lg bg-card/50 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Всё для финансового учёта
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Простые и мощные инструменты для ведения бухгалтерии вашего бизнеса
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card key={i} className="card-elevated hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Работайте с любого устройства
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Адаптивный интерфейс позволяет вести учёт с компьютера, планшета или смартфона.
                Все данные синхронизируются в реальном времени.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Быстрое добавление операций',
                  'Просмотр отчётов на ходу',
                  'Управление счетами',
                  'Работа офлайн с синхронизацией',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-[3/4] max-w-sm mx-auto rounded-3xl bg-muted/50 border-8 border-foreground/10 p-4">
                <div className="h-full rounded-2xl bg-card shadow-inner flex items-center justify-center">
                  <Smartphone className="h-24 w-24 text-muted-foreground/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Простые и понятные тарифы
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Начните бесплатно и масштабируйтесь по мере роста бизнеса
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Популярный
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground"> ₸/мес</span>
                  </div>
                  <ul className="space-y-3 text-left mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?mode=signup">
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                      Выбрать тариф
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Часто задаваемые вопросы
            </h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Начните вести учёт уже сегодня
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Бесплатная регистрация за 1 минуту. Без банковской карты.
            </p>
            <div className="mt-8">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gap-2">
                  Создать аккаунт бесплатно
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Calculator className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">БухОнлайн</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 БухОнлайн. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
