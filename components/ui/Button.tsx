
import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ className, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-secondary hover:text-secondary-foreground',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizeClasses = {
    sm: 'h-9 px-3',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
};

export default Button;
