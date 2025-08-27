import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sale } from '../types';

const ReportsScreen: React.FC = () => {
    const { sales } = useData();
    const { formatCurrency } = useTheme();

    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    const [startDate, setStartDate] = useState(lastMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const filteredSales = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, startDate, endDate]);
    
    const reportTotals = useMemo(() => {
        return filteredSales.reduce((acc, sale) => {
            acc.totalRevenue += sale.total;
            acc.totalSales += 1;
            acc.totalQuantity += sale.quantity;
            return acc;
        }, { totalRevenue: 0, totalSales: 0, totalQuantity: 0 });
    }, [filteredSales]);
    
    const handleExport = () => {
        const headers = ["Date", "Driver", "Product", "Quantity", "Total", "Location", "Payment Method"];
        const rows = filteredSales.map(s => [
            `"${new Date(s.timestamp).toLocaleString()}"`,
            `"${s.driverName}"`,
            `"${s.productName}"`,
            s.quantity,
            s.total,
            `"${s.location}"`,
            s.paymentMethod
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Sales Report</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1 w-full">
                        <label htmlFor="startDate">Start Date</label>
                        <Input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2 flex-1 w-full">
                        <label htmlFor="endDate">End Date</label>
                        <Input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <Button onClick={handleExport} className="w-full md:w-auto">Export to CSV</Button>
                </CardContent>
                <CardFooter className="grid gap-4 md:grid-cols-3 text-center md:text-left">
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-secondary-foreground/70">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportTotals.totalRevenue)}</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-secondary-foreground/70">Total Sales Transactions</p>
                        <p className="text-2xl font-bold">{reportTotals.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-secondary-foreground/70">Total Items Sold</p>
                        <p className="text-2xl font-bold">{reportTotals.totalQuantity.toLocaleString()}</p>
                    </div>
                </CardFooter>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Driver</th>
                                    <th scope="col" className="px-6 py-3">Product</th>
                                    <th scope="col" className="px-6 py-3">Qty</th>
                                    <th scope="col" className="px-6 py-3">Total</th>
                                    <th scope="col" className="px-6 py-3">Location</th>
                                    <th scope="col" className="px-6 py-3">Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map((sale: Sale) => (
                                    <tr key={sale.id} className="border-b border-border">
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium">{sale.driverName}</td>
                                        <td className="px-6 py-4">{sale.productName}</td>
                                        <td className="px-6 py-4 text-center">{sale.quantity}</td>
                                        <td className="px-6 py-4">{formatCurrency(sale.total)}</td>
                                        <td className="px-6 py-4">{sale.location}</td>
                                        <td className="px-6 py-4 capitalize">{sale.paymentMethod}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredSales.length === 0 && (
                             <p className="text-center text-foreground/70 py-12">No sales data found for the selected date range.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportsScreen;
