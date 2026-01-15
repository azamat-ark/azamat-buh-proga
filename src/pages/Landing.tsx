import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calculator, FileText, Users, TrendingUp, Shield, Wallet, ArrowRight, BarChart3, Sparkles, ChevronDown, Zap, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HeroBackground } from '@/components/landing/HeroBackground';
import { FloatingDashboard } from '@/components/landing/FloatingDashboard';
import { FeatureCard } from '@/components/landing/FeatureCard';
import { PricingCard } from '@/components/landing/PricingCard';
import { TrustBadges } from '@/components/landing/TrustBadges';
import { AnimatedButton } from '@/components/landing/AnimatedButton';
import { useState } from 'react';

const features = [
  {
    icon: Calculator,
    title: 'Умный учёт',
    description: 'Автоматическая категоризация операций с помощью AI. Импорт из любых банков.',
  },
  {
    icon: FileText,
    title: 'Документы за секунды',
    description: 'Создавайте счета и акты в один клик. Автоматическая нумерация и брендинг.',
  },
  {
    icon: Users,
    title: 'CRM для контрагентов',
    description: 'Полная история взаимодействий. Автоматические напоминания об оплате.',
  },
  {
    icon: TrendingUp,
    title: 'Аналитика в реальном времени',
    description: 'Дашборды и отчёты обновляются мгновенно. Экспорт в любой формат.',
  },
  {
    icon: Wallet,
    title: 'Зарплата без головной боли',
    description: 'Расчёт налогов и взносов автоматически. Формирование ведомостей.',
  },
  {
    icon: Shield,
    title: 'Безопасность банковского уровня',
    description: 'Шифрование данных, двухфакторная аутентификация, резервные копии.',
  },
];

const plans = [
  {
    name: 'Старт',
    price: '0',
    description: 'Идеально для начала',
    features: ['1 организация', '100 операций/месяц', '2 пользователя', 'Базовые отчёты', 'Email поддержка'],
    popular: false,
  },
  {
    name: 'Бизнес',
    price: '9 990',
    description: 'Для растущих компаний',
    features: ['5 организаций', 'Безлимит операций', '10 пользователей', 'Все отчёты + экспорт', 'API интеграции', 'Приоритетная поддержка'],
    popular: true,
  },
  {
    name: 'Про',
    price: '29 990',
    description: 'Для серьёзного бизнеса',
    features: ['Безлимит организаций', 'Безлимит пользователей', 'Белая метка', 'Выделенный сервер', 'SLA 99.9%', 'Персональный менеджер'],
    popular: false,
  },
];

const faqs = [
  {
    question: 'Чем Azamat Accounting отличается от других сервисов?',
    answer: 'Мы создали современный продукт с нуля, без легаси-кода. Интуитивный интерфейс, мгновенная скорость работы и AI-функции для автоматизации рутины.',
  },
  {
    question: 'Подходит ли для ИП и ТОО?',
    answer: 'Да, сервис оптимизирован для индивидуальных предпринимателей и товариществ с ограниченной ответственностью в Казахстане. Поддержка всех налоговых режимов.',
  },
  {
    question: 'Как импортировать данные?',
    answer: 'Загрузите CSV или Excel файл, и наш AI автоматически распознает структуру и категоризирует операции. Также доступен прямой импорт из популярных банков.',
  },
  {
    question: 'Безопасно ли хранить данные в облаке?',
    answer: 'Абсолютно. Данные шифруются по стандарту AES-256, серверы расположены в сертифицированных дата-центрах с резервированием. Регулярный бэкап каждый час.',
  },
  {
    question: 'Есть ли мобильное приложение?',
    answer: 'Веб-версия полностью адаптивна и работает как приложение на любом устройстве. Нативные iOS и Android приложения — в разработке.',
  },
];

export default function Landing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="min-h-screen bg-background noise-overlay">
      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50"
        style={{ 
          backgroundColor: `hsl(var(--background) / ${headerOpacity})`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="container flex h-16 md:h-20 items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Azamat</span>
          </motion.div>

          <motion.nav 
            className="hidden md:flex items-center gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {['Возможности', 'Тарифы', 'FAQ'].map((item, i) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </motion.nav>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link to="/auth">
              <Button variant="ghost" className="hidden sm:inline-flex hover:bg-muted/50">
                Войти
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <AnimatedButton glow className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                Начать бесплатно
              </AnimatedButton>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center pt-20">
        <HeroBackground />
        
        <div className="container relative z-10 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center mb-16">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 backdrop-blur-sm px-4 py-2 mb-8"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Новое поколение бухгалтерии</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-display-xl md:text-display-2xl mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              Финансы под{' '}
              <span className="gradient-text-animated">полным контролем</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Современный учёт для бизнеса, который ценит время и эстетику.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link to="/auth?mode=signup">
                <AnimatedButton 
                  glow
                  size="lg" 
                  className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  Попробовать бесплатно
                  <ArrowRight className="h-5 w-5" />
                </AnimatedButton>
              </Link>
              <a href="#возможности">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg group">
                  Узнать больше
                  <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <TrustBadges />
          </div>

          {/* Floating Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <FloatingDashboard />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="возможности" className="py-32 relative">
        <div className="container">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-display-lg mb-6">
              Всё, что нужно для{' '}
              <span className="gradient-text">финансового учёта</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Мощные инструменты в элегантной упаковке
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="bento-grid">
            <FeatureCard {...features[0]} index={0} className="span-2" />
            <FeatureCard {...features[1]} index={1} />
            <FeatureCard {...features[2]} index={2} />
            <FeatureCard {...features[3]} index={3} />
            <FeatureCard {...features[4]} index={4} className="span-2" />
            <FeatureCard {...features[5]} index={5} className="span-2" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Активных пользователей' },
              { value: '50M+', label: 'Обработано операций' },
              { value: '99.9%', label: 'Время работы' },
              { value: '4.9/5', label: 'Средняя оценка' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="тарифы" className="py-32 relative">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-display-lg mb-6">
              Простые и <span className="gradient-text">честные</span> тарифы
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Начните бесплатно, масштабируйтесь по мере роста
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingPeriod === 'monthly' 
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ежемесячно
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingPeriod === 'yearly' 
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ежегодно
                <span className="ml-2 text-xs text-success">-20%</span>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <PricingCard key={i} {...plan} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 relative">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-display-lg mb-6">
              Часто задаваемые <span className="gradient-text">вопросы</span>
            </h2>
          </motion.div>

          <motion.div 
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem 
                  key={i} 
                  value={`item-${i}`}
                  className="glass-card px-6 border-none"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-6 text-base font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <div className="container relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-display-lg mb-6">
              Готовы начать?
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Присоединяйтесь к тысячам компаний, которые уже управляют финансами эффективнее.
            </p>
            <Link to="/auth?mode=signup">
              <AnimatedButton 
                glow
                size="lg" 
                className="h-14 px-10 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                Создать аккаунт бесплатно
                <ArrowRight className="h-5 w-5" />
              </AnimatedButton>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Без банковской карты. Настройка за 2 минуты.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Calculator className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Azamat Accounting</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Политика конфиденциальности</a>
              <a href="#" className="hover:text-foreground transition-colors">Условия использования</a>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2026 Azamat Accounting. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}