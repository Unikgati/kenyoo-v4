

import React, { useMemo, useState } from 'react';
import DashboardCard from '../components/DashboardCard';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import SalesChart from '../components/SalesChart';
import PeakHoursChart from '../components/PeakHoursChart';
import { Sale } from '../types';
import { cn } from '../lib/utils';
import Select from '../components/ui/Select';

const DashboardScreen: React.FC = () => {
    const { sales, drivers, locations } = useData();
    const { formatCurrency } = useTheme();

    const [revenueFilter, setRevenueFilter] = useState<'specific' | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const todaysSales = useMemo(() => sales.filter(s => new Date(s.timestamp).toDateString() === today.toDateString()), [sales, today]);
    const todaysRevenue = useMemo(() => todaysSales.reduce((sum, s) => sum + s.total, 0), [todaysSales]);
    const activeDrivers = useMemo(() => drivers.filter(d => d.status === 'active').length, [drivers]);
    
    const availableYears = useMemo(() => {
        if (!sales || sales.length === 0) return [new Date().getFullYear()];
        const years = new Set(sales.map(s => new Date(s.timestamp).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [sales]);

    const months = useMemo(() => 
        Array.from({ length: 12 }, (_, i) => ({
            value: i,
            name: new Date(0, i).toLocaleString('default', { month: 'long' }),
        })), []);

    const totalRevenue = useMemo(() => {
        let filteredSales = sales;

        if (revenueFilter === 'specific') {
            filteredSales = sales.filter(s => {
                const saleDate = new Date(s.timestamp);
                return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
            });
        }
        // 'all' case uses the entire sales array

        return filteredSales.reduce((sum, s) => sum + s.total, 0);
    }, [sales, revenueFilter, selectedMonth, selectedYear]);

    const revenueComparison = useMemo((): { change: string; type: 'increase' | 'decrease'; } | null => {
        const sameDayLastWeek = new Date(today);
        sameDayLastWeek.setDate(today.getDate() - 7);
        
        const lastWeekSales = sales.filter(s => new Date(s.timestamp).toDateString() === sameDayLastWeek.toDateString());
        const lastWeekRevenue = lastWeekSales.reduce((sum, s) => sum + s.total, 0);

        if (lastWeekRevenue === 0) {
            if (todaysRevenue > 0) {
                return {
                    change: `+100%`,
                    type: 'increase',
                };
            }
            return null; // No change if both are 0
        }

        const percentChange = ((todaysRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
        
        return {
            change: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
            type: percentChange >= 0 ? 'increase' : 'decrease',
        };

    }, [sales, todaysRevenue, today]);

    const topProducts = useMemo(() => {
        const productSales = sales.reduce<Record<string, number>>((acc, sale) => {
            acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
            return acc;
        }, {});
        return Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [sales]);
    
    const dailyDriverSales = useMemo(() => {
        const salesByDriver = todaysSales.reduce<Record<string, { total: number; qris: number; cash: number }>>((acc, sale) => {
            if (!acc[sale.driverId]) {
                acc[sale.driverId] = { total: 0, qris: 0, cash: 0 };
            }
            acc[sale.driverId].total += sale.total;
            if (sale.paymentMethod.toLowerCase() === 'qris') {
                acc[sale.driverId].qris += sale.total;
            } else if (sale.paymentMethod.toLowerCase() === 'cash') {
                acc[sale.driverId].cash += sale.total;
            }
            return acc;
        }, {});

        return drivers
            .map(driver => ({
                id: driver.id,
                name: driver.name,
                totalSales: salesByDriver[driver.id]?.total || 0,
                qrisSales: salesByDriver[driver.id]?.qris || 0,
                cashSales: salesByDriver[driver.id]?.cash || 0,
            }))
            .filter(d => d.totalSales > 0)
            .sort((a, b) => b.totalSales - a.totalSales);
    }, [todaysSales, drivers]);

    const salesChartData = useMemo(() => {
        if (revenueFilter === 'all') {
            const monthlySales = sales.reduce<Record<string, number>>((acc, sale) => {
                const date = new Date(sale.timestamp);
                const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
                acc[key] = (acc[key] || 0) + sale.total;
                return acc;
            }, {});

            const data = Object.entries(monthlySales)
                .map(([key, revenue]) => {
                    const [year, month] = key.split('-');
                    return {
                        date: new Date(parseInt(year), parseInt(month), 1),
                        name: new Date(parseInt(year), parseInt(month), 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
                        revenue,
                    };
                })
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            return { title: "Monthly Sales Performance", data };
        } else {
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
                name: String(i + 1),
                revenue: 0,
            }));

            sales
                .filter(s => {
                    const saleDate = new Date(s.timestamp);
                    return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
                })
                .forEach(sale => {
                    const day = new Date(sale.timestamp).getDate() - 1;
                    dailyData[day].revenue += sale.total;
                });
            
            const monthName = new Date(0, selectedMonth).toLocaleString('default', { month: 'long' });
            return { title: `Daily Sales for ${monthName} ${selectedYear}`, data: dailyData };
        }
    }, [sales, revenueFilter, selectedMonth, selectedYear]);

    const recentSales = sales.slice(0, 5);

    const analyticsData = useMemo(() => {
        const driverRevenue: Record<string, number> = {};
        const locationSales: Record<string, number> = {};
        const daySales: Record<string, number> = {};
        const hourSales: Record<string, number> = {};
        const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        sales.forEach(sale => {
            driverRevenue[sale.driverName] = (driverRevenue[sale.driverName] || 0) + sale.total;
            
            let locationName = sale.location;
            // Defensive check: if the location string is an ID, find the real name.
            if (locationName && locationName.startsWith('loc-')) {
                const foundLocation = locations.find(l => l.id === locationName);
                locationName = foundLocation ? foundLocation.name : locationName; // Fallback to ID if not found
            }
            locationSales[locationName] = (locationSales[locationName] || 0) + 1;

            const saleDate = new Date(sale.timestamp);
            const dayName = WEEKDAYS[saleDate.getDay()];
            daySales[dayName] = (daySales[dayName] || 0) + 1;
            
            const hour = saleDate.getHours().toString();
            hourSales[hour] = (hourSales[hour] || 0) + 1;
        });

        const topDrivers = Object.entries(driverRevenue)
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 3);
            
        const topLocationsRanked = Object.entries(locationSales)
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 3);
        
        const maxLocationSales = topLocationsRanked.length > 0 ? topLocationsRanked[0][1] : 0;
        
        const topLocations = topLocationsRanked.map(([name, total]) => ({
            name,
            total,
            score: maxLocationSales > 0 ? (total / maxLocationSales) * 100 : 0
        }));
            
        const topDays = Object.entries(daySales)
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 3);
            
        const topHours = Object.entries(hourSales)
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 3);
        
        const peakHoursChartData = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            sales: Number(hourSales[i.toString()] || 0),
        }));

        return {
            topDrivers,
            topLocations,
            topDays,
            topHours,
            peakHoursChartData,
        };

    }, [sales, locations]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-col space-y-4 pb-2">
                        <div className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                             <div className="flex items-center text-xs bg-secondary rounded-md p-0.5">
                                <button
                                    onClick={() => setRevenueFilter('specific')}
                                    className={cn(
                                        'px-2 py-0.5 rounded-sm transition-colors text-xs font-medium',
                                        revenueFilter === 'specific' ? 'bg-card shadow text-card-foreground' : 'text-foreground/60 hover:bg-card/50'
                                    )}
                                >
                                    Date
                                </button>
                                <button
                                    onClick={() => setRevenueFilter('all')}
                                    className={cn(
                                        'px-2 py-0.5 rounded-sm transition-colors text-xs font-medium',
                                        revenueFilter === 'all' ? 'bg-card shadow text-card-foreground' : 'text-foreground/60 hover:bg-card/50'
                                    )}
                                >
                                    All
                                </button>
                            </div>
                        </div>
                        {revenueFilter === 'specific' && (
                            <div className="flex items-center gap-2">
                                <Select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="h-8 text-xs"
                                >
                                    {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </Select>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="h-8 text-xs"
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    </CardContent>
                </Card>
                <DashboardCard 
                    title="Today's Revenue" 
                    value={formatCurrency(todaysRevenue)} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.825-1.106-2.257 0-3.082C10.544 7.219 11.275 7 12 7c.725 0 1.45.22 2.003.659m-2.003 6v.008Z" /></svg>}
                    change={revenueComparison?.change}
                    changeType={revenueComparison?.type}
                    changeText="vs. same day last week"
                />
                <DashboardCard 
                    title="Today's Sales" 
                    value={`${todaysSales.length}`} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
                />
                <DashboardCard 
                    title="Active Drivers" 
                    value={`${activeDrivers}`} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
                />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{salesChartData.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SalesChart data={salesChartData.data} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>By quantity sold (all time)</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {topProducts.length > 0 ? (
                            <ul className="space-y-3">
                                {topProducts.map(([name, quantity]) => (
                                    <li key={name} className="flex justify-between text-sm">
                                        <span>{name}</span>
                                        <span className="font-semibold">{quantity} sold</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-foreground/60 py-4">No sales data available yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Driver's Daily Sales</CardTitle>
                        <CardDescription>Sales performance for today</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyDriverSales.length > 0 ? (
                            <ul className="space-y-6">
                                {dailyDriverSales.map((driver) => (
                                    <li key={driver.id} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{driver.name}</span>
                                            <span className="font-semibold text-accent">{formatCurrency(driver.totalSales)}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="bg-secondary/50 rounded-lg p-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-foreground/70">
                                                            <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                                                            <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="text-sm text-foreground/70">QRIS</span>
                                                    </div>
                                                    <span className="font-medium text-sm">{formatCurrency(driver.qrisSales)}</span>
                                                </div>
                                            </div>
                                            <div className="bg-secondary/50 rounded-lg p-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-foreground/70">
                                                            <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                                                            <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="text-sm text-foreground/70">Cash</span>
                                                    </div>
                                                    <span className="font-medium text-sm">{formatCurrency(driver.cashSales)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-foreground/60 py-4">No sales recorded by any driver today.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Drivers</CardTitle>
                        <CardDescription>By total revenue (all time)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analyticsData.topDrivers.length > 0 ? (
                            <ul className="space-y-4">
                                {analyticsData.topDrivers.map(([name, total], index) => (
                                    <li key={name} className="flex items-center">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary mr-4 font-bold text-secondary-foreground">{index + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-semibold">{name}</p>
                                            <p className="text-sm text-foreground/70">{formatCurrency(total)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                            <p className="text-center text-sm text-foreground/60 py-4">No driver performance data yet.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Busiest Locations</CardTitle>
                         <CardDescription>By number of sales (all time)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analyticsData.topLocations.length > 0 ? (
                            <ul className="space-y-4">
                            {analyticsData.topLocations.map((location, index) => (
                                    <li key={location.name}>
                                        <div className="flex items-center">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary mr-4 font-bold text-secondary-foreground">{index + 1}</span>
                                            <div className="flex-1">
                                                <p className="font-semibold">{location.name}</p>
                                                <p className="text-sm text-foreground/70">{location.total} transactions</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 ml-12 pl-1">
                                            <div className="w-full bg-secondary rounded-full h-1.5">
                                                <div className="bg-accent h-1.5 rounded-full" style={{ width: `${location.score}%` }}></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-foreground/60 py-4">No location data available yet.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Peak Activity</CardTitle>
                        <CardDescription>Top days & hours (all time)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="p-4 bg-secondary/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-foreground/70">
                                            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                                        </svg>
                                        <h4 className="font-semibold text-sm text-foreground/80">Busiest Days</h4>
                                    </div>
                                    <span className="text-xs text-foreground/60 bg-secondary px-2 py-1 rounded">Top 3</span>
                                </div>
                                {analyticsData.topDays.length > 0 ? (
                                    <ul className="grid gap-2">
                                        {analyticsData.topDays.map(([day, count], index) => (
                                            <li key={day} className="flex items-center justify-between text-sm bg-card/50 rounded-md p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary font-semibold text-xs text-secondary-foreground">{index + 1}</span>
                                                    <p className="font-medium">{day}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-semibold text-accent">{count}</p>
                                                    <p className="text-xs text-foreground/70">txns</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-foreground/60 text-center py-4">No data available</p>
                                )}
                            </div>

                            <div className="p-4 bg-secondary/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-foreground/70">
                                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                                        </svg>
                                        <h4 className="font-semibold text-sm text-foreground/80">Busiest Hours</h4>
                                    </div>
                                    <span className="text-xs text-foreground/60 bg-secondary px-2 py-1 rounded">Top 3</span>
                                </div>
                                {analyticsData.topHours.length > 0 ? (
                                    <ul className="grid gap-2">
                                        {analyticsData.topHours.map(([hour, count], index) => (
                                            <li key={hour} className="flex items-center justify-between text-sm bg-card/50 rounded-md p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary font-semibold text-xs text-secondary-foreground">{index + 1}</span>
                                                    <p className="font-medium">{`${hour.padStart(2, '0')}:00`}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-semibold text-accent">{count}</p>
                                                    <p className="text-xs text-foreground/70">txns</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-foreground/60 text-center py-4">No data available</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Hourly Sales Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <PeakHoursChart data={analyticsData.peakHoursChartData} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Product</th>
                                    <th scope="col" className="px-6 py-3">Driver</th>
                                    <th scope="col" className="px-6 py-3">Location</th>
                                    <th scope="col" className="px-6 py-3">Total</th>
                                    <th scope="col" className="px-6 py-3">Payment</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.length > 0 ? (
                                    recentSales.map((sale: Sale) => (
                                        <tr key={sale.id} className="border-b border-border">
                                            <td className="px-6 py-4 font-medium">{sale.productName}</td>
                                            <td className="px-6 py-4">{sale.driverName}</td>
                                            <td className="px-6 py-4">{sale.location}</td>
                                            <td className="px-6 py-4">{formatCurrency(sale.total)}</td>
                                            <td className="px-6 py-4 capitalize">{sale.paymentMethod}</td>
                                            <td className="px-6 py-4">{new Date(sale.timestamp).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-foreground/60">
                                            No recent sales to display.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardScreen;