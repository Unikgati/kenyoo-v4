
import React, { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const Input: React.FC<InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};

export default Input;
