    import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Sale } from '../types';
import PeakHoursChart from '../components/PeakHoursChart';

const LocationDashboardScreen: React.FC = () => {
    const { locationId } = useParams();
    const navigate = useNavigate();
    const { sales, locations, drivers } = useData();
    const { formatCurrency } = useTheme();

    const location = locations.find(loc => loc.id === locationId);
    if (!location) {
        return (
            <div className="p-6">
                <div className="text-center">Location not found</div>
                <Button onClick={() => navigate('/locations')} className="mt-4">
                    Back to Locations
                </Button>
            </div>
        );
    }

    // Filter sales for this location
    const locationSales = useMemo(() => {
        return sales.filter(sale => sale.location === location.name);
    }, [sales, location]);

    // 1. Hourly Sales Distribution
    const hourlySales = useMemo(() => {
        const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
            hour: hour.toString().padStart(2, '0') + ':00',
            sales: 0,
            transactions: 0
        }));

    locationSales.forEach(sale => {
        const hour = new Date(sale.timestamp).getHours();
        hourlyData[hour].sales += 1;  // Menggunakan jumlah transaksi, bukan total penjualan
        hourlyData[hour].transactions += 1;
    });        return hourlyData;
    }, [locationSales]);

    // 2. Top Performing Drivers
    const topDrivers = useMemo(() => {
        const driverStats = new Map();

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
    }, [locationSales]);

    // Top Products Analysis
    const topProducts = useMemo(() => {
        const productSales: Record<string, { name: string; quantity: number }> = {};
        locationSales.forEach(sale => {
            if (!productSales[sale.productId]) {
                productSales[sale.productId] = { name: sale.productName, quantity: 0 };
            }
            productSales[sale.productId].quantity += sale.quantity;
        });
        return Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [locationSales]);

    // 3. Peak Activity Analysis
    const peakActivity = useMemo(() => {
        const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const hourlyTransactions = Array(24).fill(0);
        const daySales: Record<string, number> = {};
        
        locationSales.forEach(sale => {
            // Count hourly transactions
            const saleDate = new Date(sale.timestamp);
            const hour = saleDate.getHours();
            hourlyTransactions[hour]++;
            
            // Count daily transactions
            const dayName = WEEKDAYS[saleDate.getDay()];
            daySales[dayName] = (daySales[dayName] || 0) + 1;
        });

        // Calculate averages
        const hourlyAverage = hourlyTransactions.reduce((a, b) => a + b, 0) / 24;
        const dailyAverage = Object.values(daySales).reduce((a, b) => a + b, 0) / 7;

        // Find peak hours
        const peakHours = hourlyTransactions
            .map((count, hour) => ({ hour, count }))
            .filter(({ count }) => count > hourlyAverage)
            .sort((a, b) => b.count - a.count);

        // Find peak days
        const peakDays = Object.entries(daySales)
            .filter(([, count]) => count > dailyAverage)
            .sort(([, a], [, b]) => b - a)
            .map(([day, count]) => ({ day, count }));

        return { peakHours, peakDays };
    }, [locationSales]);

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
                <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                </CardHeader>
                <CardContent>
                    {topProducts.length > 0 ? (
                        <ul className="space-y-3">
                            {topProducts.map((product) => (
                                <li key={product.name} className="flex justify-between text-sm">
                                    <span>{product.name}</span>
                                    <span className="font-semibold">{product.quantity} sold</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-sm text-foreground/60 py-4">No sales data available yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* 1. Hourly Sales Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Hourly Sales Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <PeakHoursChart data={hourlySales} />
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
