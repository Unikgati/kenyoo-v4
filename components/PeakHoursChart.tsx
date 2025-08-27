
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { useTheme } from '../context/ThemeContext';

interface PeakHoursChartProps {
    data: { hour: string; sales: number }[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: ValueType, name: NameType }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-card border border-border rounded-lg shadow-sm">
          <p className="label font-semibold">{`Hour: ${label}`}</p>
          <p className="intro text-accent">{`Sales: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
    const { isDarkMode } = useTheme();
    const cursorFillColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--color-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => value.endsWith(':00') ? value.split(':')[0] : ''}
                    interval={2}
                />
                <YAxis 
                    stroke="hsl(var(--color-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFillColor }} />
                <Bar dataKey="sales" fill="hsl(var(--color-accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default PeakHoursChart;