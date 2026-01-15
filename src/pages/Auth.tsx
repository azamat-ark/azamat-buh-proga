import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, ArrowLeft, Loader2, Mail, Lock, User, ArrowRight, Sparkles, Shield, Zap, BarChart3 } from 'lucide-react';
import { AnimatedInput } from '@/components/auth/AnimatedInput';
import { AuthBackground } from '@/components/auth/AuthBackground';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Введите ваше имя'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const features = [
  { icon: BarChart3, text: 'Аналитика в реальном времени' },
  { icon: Shield, text: 'Банковский уровень защиты' },
  { icon: Zap, text: 'Мгновенные отчёты' },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      let message = 'Произошла ошибка при входе';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Неверный email или пароль';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Пожалуйста, подтвердите email';
      }
      toast({ title: 'Ошибка', description: message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Успешно', description: 'Добро пожаловать!' });
    navigate('/dashboard');
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      let message = 'Произошла ошибка при регистрации';
      if (error.message.includes('already registered')) {
        message = 'Этот email уже зарегистрирован';
      }
      toast({ title: 'Ошибка', description: message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Аккаунт создан',
      description: 'Проверьте почту для подтверждения (или войдите сразу, если подтверждение отключено)',
    });
    setMode('login');
  };

  const formVariants = {
    hidden: { opacity: 0, x: mode === 'login' ? -20 : 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: mode === 'login' ? 20 : -20, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-background flex noise-overlay">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <AuthBackground />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3">
            <motion.div 
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight">Azamat</span>
          </Link>

          {/* Center content */}
          <div className="max-w-lg">
            <motion.h1 
              className="text-display-lg mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Финансовый учёт{' '}
              <span className="gradient-text">нового поколения</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-muted-foreground mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Присоединяйтесь к тысячам компаний, которые уже управляют финансами эффективнее
            </motion.p>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom testimonial */}
          <motion.div 
            className="glass-card p-6 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="h-4 w-4 text-warning fill-warning" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              "Наконец-то бухгалтерия, которой приятно пользоваться. Экономим 10+ часов в неделю."
            </p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                АК
              </div>
              <div>
                <div className="text-sm font-medium">Алия Калиева</div>
                <div className="text-xs text-muted-foreground">CFO, TechStartup KZ</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Azamat</span>
            </Link>
          </div>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              На главную
            </Link>
          </motion.div>

          {/* Form Card */}
          <motion.div
            className="glass-card p-8 md:p-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Header */}
            <div className="mb-8">
              <motion.h2 
                className="text-2xl font-bold mb-2"
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {mode === 'login' ? 'Добро пожаловать' : 'Создайте аккаунт'}
              </motion.h2>
              <motion.p 
                className="text-muted-foreground"
                key={`desc-${mode}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                {mode === 'login'
                  ? 'Введите данные для входа'
                  : 'Начните бесплатно за 2 минуты'}
              </motion.p>
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form 
                  key="login"
                  onSubmit={loginForm.handleSubmit(handleLogin)} 
                  className="space-y-5"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <AnimatedInput
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={Mail}
                    error={loginForm.formState.errors.email?.message}
                    {...loginForm.register('email')}
                  />
                  <AnimatedInput
                    id="password"
                    type="password"
                    label="Пароль"
                    placeholder="••••••••"
                    icon={Lock}
                    error={loginForm.formState.errors.password?.message}
                    {...loginForm.register('password')}
                  />
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 btn-glow" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Войти
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form 
                  key="signup"
                  onSubmit={signupForm.handleSubmit(handleSignup)} 
                  className="space-y-5"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <AnimatedInput
                    id="fullName"
                    type="text"
                    label="Ваше имя"
                    placeholder="Иван Петров"
                    icon={User}
                    error={signupForm.formState.errors.fullName?.message}
                    {...signupForm.register('fullName')}
                  />
                  <AnimatedInput
                    id="signup-email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={Mail}
                    error={signupForm.formState.errors.email?.message}
                    {...signupForm.register('email')}
                  />
                  <AnimatedInput
                    id="signup-password"
                    type="password"
                    label="Пароль"
                    placeholder="••••••••"
                    icon={Lock}
                    error={signupForm.formState.errors.password?.message}
                    {...signupForm.register('password')}
                  />
                  <AnimatedInput
                    id="confirmPassword"
                    type="password"
                    label="Подтвердите пароль"
                    placeholder="••••••••"
                    icon={Lock}
                    error={signupForm.formState.errors.confirmPassword?.message}
                    {...signupForm.register('confirmPassword')}
                  />
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 btn-glow" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Создать аккаунт
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Toggle mode */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Нет аккаунта?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors relative group"
                    >
                      Зарегистрируйтесь
                      <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors relative group"
                    >
                      Войдите
                      <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>

          {/* Terms */}
          <motion.p 
            className="text-xs text-muted-foreground text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Продолжая, вы соглашаетесь с{' '}
            <a href="#" className="underline hover:text-foreground transition-colors">Условиями использования</a>
            {' '}и{' '}
            <a href="#" className="underline hover:text-foreground transition-colors">Политикой конфиденциальности</a>
          </motion.p>
        </div>
      </div>
    </div>
  );
}