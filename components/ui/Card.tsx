
import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const Card: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
);

const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-foreground/60', className)} {...props} />
);

const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
