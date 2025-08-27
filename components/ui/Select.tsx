import React, { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const Select: React.FC<SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
