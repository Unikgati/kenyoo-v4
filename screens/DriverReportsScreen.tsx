import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getLocalDateString, getStartOfDay, getEndOfDay, parseLocalDate } from '../lib/dateUtils';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sale, Driver } from '../types';

import { Database } from '../lib/database.types';

interface ProductSalesReport {
    productId: string;
    productName: string;
    quantity: number;
    qrisTotal: number;
    cashTotal: number;
    totalAmount: number;
    date: string;
    coconutsCarried: number; // Dari driver_daily_setup
    coconutsLeft: number; // Dihitung dari coconutsCarried - total quantity
    changeAmount: number; // Dari driver_daily_setup
    depositAmount: number; // Dihitung dari totalAmount + changeAmount (Total penjualan + Uang kembalian yang dibawa)
}

interface DriverSalesReport {
    driverId: string;
    driverName: string;
    products: ProductSalesReport[];
}

const DriverReportsScreen: React.FC = () => {
    const { sales, drivers, driverDailySetup } = useData();
    const { formatCurrency } = useTheme();
    const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

    const today = getStartOfDay();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    // Set tanggal default ke hari ini
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());

    const filteredDriverDailySetup = useMemo(() => {
        console.log('Raw driver daily setup:', driverDailySetup);
        console.log('Selected date:', selectedDate);
        const filtered = driverDailySetup.filter(setup => {
            // Filter untuk tanggal yang dipilih saja
            return setup.date === selectedDate;
        });
        console.log('Filtered setup:', filtered);
        return filtered;
    }, [driverDailySetup, selectedDate]);

    const filteredSales = useMemo(() => {
        const start = parseLocalDate(selectedDate); // Beginning of the selected date
        const end = getEndOfDay(parseLocalDate(selectedDate)); // End of the selected date

        return sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, selectedDate]);

    const driverReports = useMemo(() => {
        return drivers.map(driver => {
            const driverSales = filteredSales.filter(sale => sale.driverId === driver.id);
            
            // Group sales by date first using local timezone
            const salesByDate = (driverSales as Sale[]).reduce((acc, sale) => {
                // Convert UTC timestamp to local date string
                const localDate = getLocalDateString(new Date(sale.timestamp));
                if (!acc[localDate]) acc[localDate] = [];
                acc[localDate].push(sale);
                return acc;
            }, {} as Record<string, Sale[]>);

            // Process each date's sales
            const processedSales = Object.entries(salesByDate).map(([localDate, sales]) => {
                // Use the local date string directly for searching setup
                const searchDate = localDate;
                console.log('Processing date:', searchDate, 'for driver:', driver.name);
                
                const dailySetup = filteredDriverDailySetup.find(s => 
                    s.driver_id === driver.id && 
                    s.date === searchDate
                );
                
                console.log('Found setup:', dailySetup);

                // Group by product for this date
                const productSales = sales.reduce((acc, sale) => {
                    const existingProduct = acc.find(p => p.productId === sale.productId);
                    if (existingProduct) {
                        existingProduct.quantity += sale.quantity;
                        if (sale.paymentMethod === 'qris') {
                            existingProduct.qrisTotal += sale.total;
                        } else {
                            existingProduct.cashTotal += sale.total;
                        }
                        existingProduct.totalAmount = existingProduct.qrisTotal + existingProduct.cashTotal;
                    } else {
                        acc.push({
                            productId: sale.productId,
                            productName: sale.productName,
                            quantity: sale.quantity,
                            qrisTotal: sale.paymentMethod === 'qris' ? sale.total : 0,
                            cashTotal: sale.paymentMethod === 'cash' ? sale.total : 0,
                            totalAmount: sale.total,
                            date: localDate, // Add date to track which day this belongs to
                            coconutsCarried: dailySetup?.coconuts_carried || 0,
                            coconutsLeft: 0, // Will be calculated later
                            changeAmount: dailySetup?.change_amount || 0,
                            depositAmount: 0 // Will be calculated
                        });
                    }
                    return acc;
                }, [] as (DriverSalesReport['products'][0] & { date: string })[]);

                // Calculate totals for this date's products
                const totalQuantity = productSales.reduce((sum, p) => sum + p.quantity, 0);
                const coconutsLeft = (dailySetup?.coconuts_carried || 0) - totalQuantity;

                productSales.forEach(product => {
                    product.coconutsLeft = coconutsLeft;
                    // Deposit Amount = Total penjualan + Uang kembalian yang dibawa
                    // Hanya menggunakan cash total untuk deposit
                    product.depositAmount = product.cashTotal + (dailySetup?.change_amount || 0);
                });

                return productSales;
            });

            // Flatten all dates' sales into one array and sort by date
            const products = processedSales.flat().sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            return {
                driverId: driver.id,
                driverName: driver.name,
                products
            };
        });
    }, [drivers, filteredSales, filteredDriverDailySetup]);

    const handleExport = () => {
        const headers = ["Driver", "Date", "Product", "QTY", "QRIS Total", "Cash Total", "Total Amount", "Coconuts Carried", "Coconuts Left", "Change Amount", "Deposit Amount"];
        const rows: string[] = [];

        driverReports.forEach(driver => {
            driver.products.forEach(product => {
                rows.push([
                    `"${driver.driverName}"`,
                    `"${new Date(product.date).toLocaleDateString()}"`,
                    `"${product.productName}"`,
                    product.quantity,
                    product.qrisTotal,
                    product.cashTotal,
                    product.totalAmount,
                    product.coconutsCarried,
                    product.coconutsLeft,
                    product.changeAmount,
                    product.depositAmount
                ].join(','));
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `driver_reports_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Driver Reports (Beta)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1 w-full">
                        <label htmlFor="selectedDate">Select Date</label>
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const prevDay = new Date(selectedDate);
                                    prevDay.setDate(prevDay.getDate() - 1);
                                    setSelectedDate(getLocalDateString(prevDay));
                                }}
                                className="h-9 w-9"
                                title="Previous Day"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </Button>
                            <Input 
                                type="date" 
                                id="selectedDate" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)} 
                                className="w-44"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const nextDay = new Date(selectedDate);
                                    nextDay.setDate(nextDay.getDate() + 1);
                                    setSelectedDate(getLocalDateString(nextDay));
                                }}
                                className="h-9 w-9"
                                title="Next Day"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                    <Button onClick={handleExport} className="w-full md:w-auto">Export to CSV</Button>
                </CardContent>
            </Card>

            {/* Driver List with Reports */}
            <div className="space-y-4">
                {driverReports.map((driver) => (
                    <Card key={driver.driverId}>
                        <CardHeader 
                            className="cursor-pointer hover:bg-accent/5"
                            onClick={() => setExpandedDriver(
                                expandedDriver === driver.driverId ? null : driver.driverId
                            )}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <CardTitle className="text-lg">{driver.driverName}</CardTitle>
                                    {(() => {
                                        // Gunakan tanggal yang dipilih untuk badge
                                        // selectedDate sudah tersedia dari state
                                        console.log('Selected date for badges:', selectedDate);
                                        
                                        const selectedSetup = filteredDriverDailySetup.find(
                                            setup => setup.driver_id === driver.driverId && setup.date === selectedDate
                                        );
                                        console.log('Setup for selected date:', selectedSetup);
                                        
                                        // Hitung total penjualan untuk tanggal yang dipilih
                                        const selectedDateSales = filteredSales.filter(sale => 
                                            sale.driverId === driver.driverId && 
                                            getLocalDateString(new Date(sale.timestamp)) === selectedDate
                                        );
                                        console.log('Sales for selected date:', selectedDateSales);
                                        
                                        const coconutsCarried = selectedSetup?.coconuts_carried || 0;
                                        const changeAmount = selectedSetup?.change_amount || 0;
                                        const coconutsSold = selectedDateSales.reduce((sum, sale) => sum + sale.quantity, 0);
                                        const coconutsLeft = coconutsCarried - coconutsSold;
                                        // Hanya menghitung penjualan cash
                                        const totalCashSales = selectedDateSales.reduce((sum, sale) => 
                                            sale.paymentMethod === 'cash' ? sum + sale.total : sum, 0);
                                        const depositAmount = totalCashSales + changeAmount;

                                        return (
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 1h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Carried: {coconutsCarried}</span>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Left: {coconutsLeft}</span>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Change: {formatCurrency(changeAmount)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Deposit: {formatCurrency(depositAmount)}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-5 w-5 transition-transform ${
                                        expandedDriver === driver.driverId ? 'transform rotate-180' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M19 9l-7 7-7-7" 
                                    />
                                </svg>
                            </div>
                        </CardHeader>

                        {expandedDriver === driver.driverId && (
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold">QTY</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold">QRIS Total</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold">Cash Total</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold">Total QRIS & Cash</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {driver.products.length > 0 ? (
                                                <>
                                                    {driver.products.map((product) => (
                                                        <tr key={`${product.productId}-${product.date}`} className="hover:bg-muted/50">
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm">{product.productName}</div>
                                                                <div className="text-xs text-muted-foreground">{new Date(product.date).toLocaleDateString()}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm">{product.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-sm">{formatCurrency(product.qrisTotal)}</td>
                                                            <td className="px-4 py-3 text-right text-sm">{formatCurrency(product.cashTotal)}</td>
                                                            <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(product.totalAmount)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-muted/10 font-medium">
                                                        <td className="px-4 py-3 text-sm">Total</td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            {driver.products.reduce((sum, p) => sum + p.quantity, 0)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            {formatCurrency(driver.products.reduce((sum, p) => sum + p.qrisTotal, 0))}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            {formatCurrency(driver.products.reduce((sum, p) => sum + p.cashTotal, 0))}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            {formatCurrency(driver.products.reduce((sum, p) => sum + p.totalAmount, 0))}
                                                        </td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                        No reports found for the selected date range
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}

                {driverReports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        No drivers found
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverReportsScreen;
