
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useTheme } from '../context/ThemeContext';

interface SalesChartProps {
    data: { name: string; revenue: number }[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
    const { formatCurrency } = useTheme();

    const yAxisFormatter = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short'
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: ValueType }[]; label?: string }) => {
        if (active && payload && payload.length) {
          return (
            <div className="p-2 bg-card border border-border rounded-lg shadow-sm">
              <p className="label font-semibold">{`${label}`}</p>
              <p className="intro text-accent">{`Revenue: ${formatCurrency(payload[0].value as number)}`}</p>
            </div>
          );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--color-accent))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--color-accent))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--color-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--color-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={yAxisFormatter} />
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--color-accent))" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;