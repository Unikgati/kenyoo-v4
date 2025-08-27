
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface DashboardCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'increase' | 'decrease';
    changeText?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, change, changeType, changeText }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-foreground/70">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change && (
                    <p className={`text-xs ${changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                        {change} {changeText || 'from last week'}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default DashboardCard;
