    import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Sale } from '../types';
import PeakHoursChart from '../components/PeakHoursChart';

interface HourlyData {
    hour: string;
    sales: number;
    transactions: number;
}

interface DailyHourlyStats {
    date: string;
    formattedDate: string;
    hourlyData: HourlyData[];
    total: number;
}

interface DriverStats {
    driverId: string;
    driverName: string;
    totalSales: number;
    transactions: number;
}

interface ProductStats {
    name: string;
    quantity: number;
}

interface DailyProductStats {
    date: string;
    formattedDate: string;
    products: ProductStats[];
    total: number;
}

interface PeakActivityData {
    peakHours: Array<{ hour: number; count: number }>;
    peakDays: Array<{ day: string; count: number }>;
}

const LocationDashboardScreen: React.FC = () => {
    const { locationId } = useParams();
    const navigate = useNavigate();
    const { sales, locations, drivers, loading, error } = useData();
    const { formatCurrency } = useTheme();
    
    // State for view modes
    const [productsViewMode, setProductsViewMode] = useState<'all' | 'daily'>('all');
    const [hourlyViewMode, setHourlyViewMode] = useState<'all' | 'daily'>('all');
    const [currentProductDayIndex, setCurrentProductDayIndex] = useState(0);
    const [currentHourlyDayIndex, setCurrentHourlyDayIndex] = useState(0);

    // Move location finding to useMemo to keep it consistent
    const location = useMemo(() => locations.find(loc => loc.id === locationId), [locations, locationId]);
    
    // Pre-calculate locationSales even if we might not use it
    const locationSales = useMemo(() => {
        if (!location) return [];
        return sales.filter(sale => sale.location === location.name);
    }, [sales, location]);

    // 1. Hourly Sales Distribution
    const { allHourlySales, dailyHourlySales } = useMemo(() => {
        if (!location) return { allHourlySales: [], dailyHourlySales: [] };

        // Calculate overall hourly data
        const overallHourlyData = Array.from({ length: 24 }, (_, hour) => ({
            hour: hour.toString().padStart(2, '0') + ':00',
            sales: 0,
            transactions: 0
        }));

        // Group sales by date for daily view
        const dailySalesMap = new Map<string, HourlyData[]>();

        locationSales.forEach(sale => {
            const saleDate = new Date(sale.timestamp);
            const hour = saleDate.getHours();
            
            // Update overall data
            overallHourlyData[hour].sales += 1;
            overallHourlyData[hour].transactions += 1;
            
            // Update daily data
            const dateKey = saleDate.toISOString().split('T')[0];
            const formattedDate = saleDate.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!dailySalesMap.has(dateKey)) {
                dailySalesMap.set(dateKey, Array.from({ length: 24 }, (_, h) => ({
                    hour: h.toString().padStart(2, '0') + ':00',
                    sales: 0,
                    transactions: 0
                })));
            }
            
            const dailyData = dailySalesMap.get(dateKey)!;
            dailyData[hour].sales += 1;
            dailyData[hour].transactions += 1;
        });

        // Convert daily map to array and sort by date
        const dailyStats: DailyHourlyStats[] = Array.from(dailySalesMap.entries())
            .map(([date, hourlyData]) => ({
                date,
                formattedDate: new Date(date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                hourlyData,
                total: hourlyData.reduce((sum, hour) => sum + hour.transactions, 0)
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        return {
            allHourlySales: overallHourlyData,
            dailyHourlySales: dailyStats
        };
    }, [locationSales, location]);

    // 2. Top Performing Drivers
    const topDrivers = useMemo<DriverStats[]>(() => {
        if (!location) return [];
        const driverStats = new Map<string, DriverStats>();

        locationSales.forEach(sale => {
            const existing = driverStats.get(sale.driverId) || {
                driverId: sale.driverId,
                driverName: sale.driverName,
                totalSales: 0,
                transactions: 0
            };

            existing.totalSales += sale.total;
            existing.transactions += 1;

            driverStats.set(sale.driverId, existing);
        });

        return Array.from(driverStats.values())
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5);
    }, [locationSales, location]);

    // Top Products Analysis
    const { topProducts, dailyProducts } = useMemo(() => {
        if (!location) return { topProducts: [], dailyProducts: [] };
        
        // Calculate overall top products
        const productSales: Record<string, ProductStats> = {};
        const dailySalesMap = new Map<string, Record<string, ProductStats>>();
        
        locationSales.forEach(sale => {
            // Overall products
            if (!productSales[sale.productId]) {
                productSales[sale.productId] = { name: sale.productName, quantity: 0 };
            }
            productSales[sale.productId].quantity += sale.quantity;
            
            // Daily products
            const date = new Date(sale.timestamp);
            const dateKey = date.toISOString().split('T')[0];
            if (!dailySalesMap.has(dateKey)) {
                dailySalesMap.set(dateKey, {});
            }
            
            const dailyProducts = dailySalesMap.get(dateKey)!;
            if (!dailyProducts[sale.productId]) {
                dailyProducts[sale.productId] = { name: sale.productName, quantity: 0 };
            }
            dailyProducts[sale.productId].quantity += sale.quantity;
        });

        // Process daily sales
        const dailyProductStats: DailyProductStats[] = Array.from(dailySalesMap.entries())
            .map(([date, products]) => {
                const productList = Object.values(products)
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5);
                
                const total = productList.reduce((sum, product) => sum + product.quantity, 0);
                const dateObj = new Date(date);
                
                return {
                    date,
                    formattedDate: dateObj.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    products: productList,
                    total
                };
            })
            .sort((a, b) => b.date.localeCompare(a.date));

        return {
            topProducts: Object.values(productSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5),
            dailyProducts: dailyProductStats
        };
    }, [locationSales, location]);

    // 3. Peak Activity Analysis
    const peakActivity = useMemo<PeakActivityData>(() => {
        if (!location) return { peakHours: [], peakDays: [] };
        
        const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const hourlyTransactions = Array(24).fill(0);
        const daySales: Record<string, number> = {};
        
        locationSales.forEach(sale => {
            const saleDate = new Date(sale.timestamp);
            const hour = saleDate.getHours();
            hourlyTransactions[hour]++;
            
            const dayName = WEEKDAYS[saleDate.getDay()];
            daySales[dayName] = (daySales[dayName] || 0) + 1;
        });

        const hourlyAverage = hourlyTransactions.reduce((a, b) => a + b, 0) / 24;
        const dailyAverage = Object.values(daySales).reduce((a, b) => a + b, 0) / 7;

        const peakHours = hourlyTransactions
            .map((count, hour) => ({ hour, count }))
            .filter(({ count }) => count > hourlyAverage)
            .sort((a, b) => b.count - a.count);

        const peakDays = Object.entries(daySales)
            .filter(([, count]) => count > dailyAverage)
            .sort(([, a], [, b]) => b - a)
            .map(([day, count]) => ({ day, count }));

        return { peakHours, peakDays };
    }, [locationSales, location]);

    // Handle loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="space-y-4 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="text-sm text-muted-foreground">Loading location data...</p>
                </div>
            </div>
        );
    }

    // Handle error state
    if (error) {
        return (
            <div className="p-6">
                <div className="max-w-xl mx-auto bg-red-50 dark:bg-red-900/10 rounded-lg p-4">
                    <div className="text-center space-y-3">
                        <p className="text-red-600 dark:text-red-400">Error loading location data</p>
                        <p className="text-sm text-red-500/70 dark:text-red-400/70">{error.message}</p>
                        <Button 
                            onClick={() => navigate('/locations')}
                            variant="ghost"
                            className="mt-2"
                        >
                            Back to Locations
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Make sure we have locations data
    if (!locations || locations.length === 0) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <p className="text-muted-foreground">No locations available</p>
                    <Button onClick={() => navigate('/locations')} className="mt-4">
                        Back to Locations List
                    </Button>
                </div>
            </div>
        );
    }

    // Check if location exists
    if (!location) {
        return (
            <div className="p-6">
                <div className="text-center space-y-2">
                    <p className="text-muted-foreground">Location not found</p>
                    <p className="text-sm text-muted-foreground/70">The location you're looking for doesn't exist or has been removed.</p>
                    <Button onClick={() => navigate('/locations')} className="mt-4">
                        Back to Locations
                    </Button>
                </div>
            </div>
        );
    }



    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{location.name}</h1>
                    <p className="text-muted-foreground">Location Dashboard</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/locations')}
                    title="Back to Locations"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                    </svg>
                </Button>
            </div>

            {/* Top Products */}
            <Card>
                <CardHeader className="space-y-0 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle>Top Products</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={productsViewMode === 'all' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setProductsViewMode('all')}
                                className="h-8"
                            >
                                Overall
                            </Button>
                            <Button
                                variant={productsViewMode === 'daily' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                    setProductsViewMode('daily');
                                    setCurrentProductDayIndex(0);
                                }}
                                className="h-8"
                            >
                                Daily
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {productsViewMode === 'all' ? (
                        topProducts.length > 0 ? (
                            <ul className="space-y-3">
                                {topProducts.map((product) => (
                                    <li key={product.name} className="flex items-center justify-between text-sm bg-secondary/20 rounded-md p-3">
                                        <span className="font-medium">{product.name}</span>
                                        <span className="font-semibold">{product.quantity} sold</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-foreground/60 py-4">No sales data available yet.</p>
                        )
                    ) : dailyProducts.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentProductDayIndex(Math.min(currentProductDayIndex + 1, dailyProducts.length - 1))}
                                    disabled={currentProductDayIndex >= dailyProducts.length - 1}
                                    className="h-8 w-8"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </Button>
                                <p className="text-sm font-medium">{dailyProducts[currentProductDayIndex]?.formattedDate}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentProductDayIndex(Math.max(currentProductDayIndex - 1, 0))}
                                    disabled={currentProductDayIndex <= 0}
                                    className="h-8 w-8"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </Button>
                            </div>
                            <ul className="space-y-2">
                                {dailyProducts[currentProductDayIndex]?.products.map((product) => (
                                    <li key={product.name} className="flex items-center justify-between text-sm bg-secondary/20 rounded-md p-3">
                                        <span className="font-medium">{product.name}</span>
                                        <span className="font-semibold">{product.quantity} sold</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-2 border-t">
                                <p className="text-sm text-foreground/70 flex items-center justify-between">
                                    <span>Total Sales</span>
                                    <span className="font-semibold">{dailyProducts[currentProductDayIndex]?.total || 0} items</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-foreground/60 py-4">No daily sales data available.</p>
                    )}
                </CardContent>
            </Card>

            {/* 1. Hourly Sales Distribution */}
            <Card>
                <CardHeader className="space-y-0 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle>Hourly Sales Distribution</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={hourlyViewMode === 'all' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setHourlyViewMode('all')}
                                className="h-8"
                            >
                                Overall
                            </Button>
                            <Button
                                variant={hourlyViewMode === 'daily' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                    setHourlyViewMode('daily');
                                    setCurrentHourlyDayIndex(0);
                                }}
                                className="h-8"
                            >
                                Daily
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {hourlyViewMode === 'daily' && dailyHourlySales.length > 0 && (
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentHourlyDayIndex(Math.max(currentHourlyDayIndex - 1, 0))}
                                disabled={currentHourlyDayIndex <= 0}
                                className="h-8 w-8"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                </svg>
                            </Button>
                            <p className="text-sm font-medium">
                                {dailyHourlySales[currentHourlyDayIndex]?.formattedDate}
                            </p>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentHourlyDayIndex(Math.min(currentHourlyDayIndex + 1, dailyHourlySales.length - 1))}
                                disabled={currentHourlyDayIndex >= dailyHourlySales.length - 1}
                                className="h-8 w-8"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            </Button>
                        </div>
                    )}
                    {hourlyViewMode === 'all' ? (
                        <PeakHoursChart data={allHourlySales} />
                    ) : dailyHourlySales.length > 0 ? (
                        <>
                            <PeakHoursChart data={dailyHourlySales[currentHourlyDayIndex]?.hourlyData || []} />
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-foreground/70 flex items-center justify-between">
                                    <span>Total Transactions</span>
                                    <span className="font-semibold">{dailyHourlySales[currentHourlyDayIndex]?.total || 0}</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-sm text-foreground/60 py-4">No hourly data available.</p>
                    )}
                </CardContent>
            </Card>

            {/* 2. Top Performing Drivers */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Performing Drivers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3">Driver</th>
                                    <th className="text-right py-3">Total Sales</th>
                                    <th className="text-right py-3">Transactions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topDrivers.map(driver => (
                                    <tr key={driver.driverId} className="border-b">
                                        <td className="py-3">{driver.driverName}</td>
                                        <td className="text-right py-3">{formatCurrency(driver.totalSales)}</td>
                                        <td className="text-right py-3">{driver.transactions}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Peak Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Peak Activity</CardTitle>
                    <p className="text-sm text-foreground/60">Top days & hours</p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-secondary/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-foreground/70">
                                        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                                    </svg>
                                    <h4 className="font-semibold text-sm text-foreground/80">Busiest Days</h4>
                                </div>
                            </div>
                            {peakActivity.peakDays.length > 0 ? (
                                <ul className="grid gap-2">
                                    {peakActivity.peakDays.map(({ day, count }, index) => (
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
                            </div>
                            {peakActivity.peakHours.length > 0 ? (
                                <ul className="grid gap-2">
                                    {peakActivity.peakHours.map(({ hour, count }, index) => (
                                        <li key={hour} className="flex items-center justify-between text-sm bg-card/50 rounded-md p-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary font-semibold text-xs text-secondary-foreground">{index + 1}</span>
                                                <p className="font-medium">{hour.toString().padStart(2, '0')}:00</p>
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
    );
};

export default LocationDashboardScreen;
