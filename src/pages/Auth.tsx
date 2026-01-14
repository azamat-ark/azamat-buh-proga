import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, ArrowLeft, Loader2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
                  <Calculator className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">БухОнлайн</span>
              </div>
              <CardTitle className="text-2xl">
                {mode === 'login' ? 'Вход в систему' : 'Создание аккаунта'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Введите email и пароль для входа'
                  : 'Заполните данные для регистрации'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="input-group">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Войти
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="input-group">
                    <Label htmlFor="fullName">Ваше имя</Label>
                    <Input
                      id="fullName"
                      placeholder="Иван Петров"
                      {...signupForm.register('fullName')}
                    />
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <Label htmlFor="signup-password">Пароль</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      {...signupForm.register('password')}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      {...signupForm.register('confirmPassword')}
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Создать аккаунт
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center text-sm">
                {mode === 'login' ? (
                  <p className="text-muted-foreground">
                    Нет аккаунта?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-primary hover:underline font-medium"
                    >
                      Зарегистрируйтесь
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Уже есть аккаунт?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline font-medium"
                    >
                      Войдите
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center gradient-hero p-12">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">
            Управляйте финансами бизнеса
          </h2>
          <p className="text-lg opacity-90">
            Простой и удобный учёт доходов, расходов и документов для малого бизнеса в Казахстане
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              'Учёт операций',
              'Счета и акты',
              'Отчёты P&L',
              'Командная работа',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary-foreground/80" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
