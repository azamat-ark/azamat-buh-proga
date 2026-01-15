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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      setIsGoogleLoading(false);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось войти через Google', 
        variant: 'destructive' 
      });
    }
    // Don't setIsGoogleLoading(false) on success - redirect will happen
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

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">или</span>
                    </div>
                  </div>

                  {/* Google Sign In */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button 
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full h-12 text-base font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-foreground transition-all duration-200 group" 
                      variant="outline"
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              className="fill-[#4285F4]"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              className="fill-[#34A853]"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              className="fill-[#FBBC05]"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              className="fill-[#EA4335]"
                            />
                          </svg>
                          Войти через Google
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

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">или</span>
                    </div>
                  </div>

                  {/* Google Sign Up */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button 
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full h-12 text-base font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-foreground transition-all duration-200 group" 
                      variant="outline"
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              className="fill-[#4285F4]"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              className="fill-[#34A853]"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              className="fill-[#FBBC05]"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              className="fill-[#EA4335]"
                            />
                          </svg>
                          Регистрация через Google
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