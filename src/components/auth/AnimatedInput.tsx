import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, icon: Icon, error, type, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <label 
          htmlFor={props.id} 
          className="text-sm font-medium text-foreground/80"
        >
          {label}
        </label>
        
        <div className="relative">
          {/* Glow effect on focus */}
          <motion.div
            className={cn(
              "absolute -inset-0.5 rounded-xl opacity-0 blur-sm transition-opacity duration-300",
              "bg-gradient-to-r from-primary/50 to-accent/50"
            )}
            animate={{ opacity: isFocused ? 1 : 0 }}
          />
          
          {/* Input container */}
          <div
            className={cn(
              "relative flex items-center rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-300",
              isFocused 
                ? "border-primary/50 bg-background/80" 
                : "border-border/50 hover:border-border",
              error && "border-destructive/50"
            )}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12">
              <Icon 
                className={cn(
                  "h-5 w-5 transition-colors duration-300",
                  isFocused ? "text-primary" : "text-muted-foreground"
                )} 
              />
            </div>
            
            {/* Input */}
            <input
              ref={ref}
              type={isPassword && showPassword ? 'text' : type}
              className={cn(
                "flex-1 h-12 bg-transparent text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none text-base",
                className
              )}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />
            
            {/* Password toggle */}
            {isPassword && (
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center w-12 h-12 text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </motion.button>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <motion.p
            className="text-sm text-destructive"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';