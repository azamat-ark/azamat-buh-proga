import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular: boolean;
  index: number;
}

export function PricingCard({ name, price, description, features, popular, index }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative ${popular ? 'z-10' : ''}`}
    >
      {/* Popular badge */}
      {popular && (
        <motion.div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Sparkles className="h-3 w-3" />
            Популярный
          </span>
        </motion.div>
      )}

      {/* Card */}
      <div className={`relative h-full rounded-3xl ${popular ? 'p-[2px] bg-gradient-to-br from-primary via-accent to-primary' : ''}`}>
        <div className={`h-full rounded-3xl glass-card p-8 ${popular ? 'bg-card' : ''}`}>
          {/* Glow effect for popular */}
          {popular && (
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-xl opacity-50 -z-10" />
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold mb-2">{name}</h3>
            <p className="text-sm text-muted-foreground mb-6">{description}</p>
            
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold tracking-tight">{price}</span>
              <span className="text-muted-foreground text-lg">₸/мес</span>
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-4 mb-8">
            {features.map((feature, i) => (
              <motion.li 
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                viewport={{ once: true }}
              >
                <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${popular ? 'bg-gradient-to-br from-primary to-accent' : 'bg-primary/20'}`}>
                  <Check className={`h-3 w-3 ${popular ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>
                <span className="text-sm">{feature}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <Link to="/auth?mode=signup" className="block">
            <Button 
              className={`w-full h-12 text-base font-semibold ${
                popular 
                  ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 btn-glow' 
                  : 'variant-outline'
              }`}
              variant={popular ? 'default' : 'outline'}
            >
              Выбрать тариф
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}