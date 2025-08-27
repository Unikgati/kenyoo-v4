import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={clsx(
                    'animate-spin rounded-full border-2',
                    'border-r-transparent border-t-transparent',
                    'border-primary',
                    sizeClasses[size],
                    className
                )}
            />
        </div>
    );
};

export default LoadingSpinner;
