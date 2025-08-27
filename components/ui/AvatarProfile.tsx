import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface AvatarProfileProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    showInfo?: boolean;
}

const AvatarProfile = ({ 
    name, 
    size = 'md',
    showInfo = true 
}: AvatarProfileProps) => {
    const { isDarkMode } = useTheme();
    // Generate initials from name (max 2 characters)
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Use primary color classes with opacity variations
    const getBackgroundClasses = () => {
        return isDarkMode
            ? 'bg-primary/90 text-primary-foreground'
            : 'bg-primary text-primary-foreground';
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'w-8 h-8 text-sm';
            case 'lg':
                return 'w-16 h-16 text-2xl';
            default:
                return 'w-12 h-12 text-lg';
        }
    };

    return (
        <div 
            className={`${getSizeClasses()} rounded-full flex items-center justify-center font-semibold ${getBackgroundClasses()}`}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
};

export { AvatarProfile };
