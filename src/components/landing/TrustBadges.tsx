import { motion } from 'framer-motion';
import { Shield, Lock, Zap, Award } from 'lucide-react';

const badges = [
  { icon: Shield, label: 'SSL Защита' },
  { icon: Lock, label: 'Данные зашифрованы' },
  { icon: Zap, label: '99.9% Uptime' },
  { icon: Award, label: 'ISO 27001' },
];

export function TrustBadges() {
  return (
    <motion.div 
      className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      {badges.map((badge, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-2 text-muted-foreground/70"
          whileHover={{ scale: 1.05, color: 'hsl(var(--foreground))' }}
          transition={{ duration: 0.2 }}
        >
          <badge.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{badge.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}