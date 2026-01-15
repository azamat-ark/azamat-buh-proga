import { motion, useScroll, useTransform } from 'framer-motion';
import { TrendingUp, Receipt, BarChart3, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useRef } from 'react';

export function FloatingDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [5, 0, -5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  const stats = [
    { label: 'Доходы', value: '2,450,000 ₸', icon: TrendingUp, positive: true, change: '+12.5%' },
    { label: 'Расходы', value: '1,280,000 ₸', icon: Receipt, positive: false, change: '-3.2%' },
    { label: 'Прибыль', value: '1,170,000 ₸', icon: BarChart3, positive: true, change: '+23.8%' },
    { label: 'Счета', value: '12', icon: FileText, positive: true, change: '+4' },
  ];

  return (
    <div ref={containerRef} className="relative w-full max-w-5xl mx-auto perspective-1000">
      <motion.div
        style={{ y, rotateX, scale }}
        className="relative"
      >
        {/* Outer glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-2xl opacity-60" />
        
        {/* Main card */}
        <div className="relative glass-card rounded-3xl p-1 shadow-glass-lg">
          {/* Inner content */}
          <div className="rounded-2xl bg-card/80 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Январь 2026</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="glass-card p-4 group hover:bg-card/80 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <stat.icon className="h-4 w-4" />
                    <span>{stat.label}</span>
                  </div>
                  <div className={`text-xl md:text-2xl font-bold ${stat.positive ? 'text-foreground' : 'text-foreground'}`}>
                    {stat.value}
                  </div>
                  <div className={`flex items-center gap-1 text-xs mt-1 ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                    {stat.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{stat.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="relative h-40 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0,100 Q50,80 100,85 T200,70 T300,75 T400,50 T500,55 T600,30 L600,150 L0,150 Z"
                  fill="url(#chartGradient)"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  viewport={{ once: true }}
                />
                <motion.path
                  d="M0,100 Q50,80 100,85 T200,70 T300,75 T400,50 T500,55 T600,30"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  viewport={{ once: true }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <motion.div
          className="absolute -top-8 -right-8 glass-card p-4 rounded-xl hidden lg:block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-sm font-medium">Новый платёж</div>
              <div className="text-xs text-muted-foreground">+450,000 ₸</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute -bottom-6 -left-6 glass-card p-3 rounded-xl hidden lg:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">5 новых счетов</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}