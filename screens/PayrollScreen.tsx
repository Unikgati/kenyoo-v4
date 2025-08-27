import React, { useState, useMemo, Fragment } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { DriverType, Payment } from '../types';
import PaymentModal from '../components/PaymentModal';
import SuccessModal from '../components/SuccessModal';

interface CalculatedPayroll {
    driverId: string;
    driverName: string;
    driverType: DriverType;
    totalSales: number;
    totalEarnings: number;
    amountPaid: number;
    remainingBalance: number;
    status: 'Paid' | 'Unpaid' | 'No Payroll';
    paymentsForPeriod: Payment[];
}

const PayrollScreen: React.FC = () => {
    const { drivers, sales, payments, addPayment, products } = useData();
    const { formatCurrency } = useTheme();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        driverId: string | null;
        driverName: string | null;
        remainingAmount: number;
    }>({ isOpen: false, driverId: null, driverName: null, remainingAmount: 0 });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');


    const handleDateChange = (part: 'month' | 'year', value: number) => {
        const newDate = new Date(selectedDate);
        if (part === 'month') newDate.setMonth(value);
        if (part === 'year') newDate.setFullYear(value);
        setSelectedDate(newDate);
    };
    
    const calculatedPayroll = useMemo((): CalculatedPayroll[] => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        return drivers.map(driver => {
            const driverSales = sales.filter(sale => {
                const saleDate = new Date(sale.timestamp);
                return sale.driverId === driver.id &&
                       saleDate.getFullYear() === year &&
                       saleDate.getMonth() === month;
            });

            const totalSales = driverSales.reduce((sum, sale) => sum + sale.total, 0);
            
             const realTotalCommission = driverSales.reduce((sum, sale) => {
                const product = products.find(p => p.id === sale.productId);
                return sum + (product ? product.commission * sale.quantity : 0);
             }, 0);


            const totalEarnings = realTotalCommission;
            
            const paymentsForPeriod = payments.filter(p => p.driverId === driver.id && p.period === periodKey);
            const amountPaid = paymentsForPeriod.reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = totalEarnings - amountPaid;

            let status: CalculatedPayroll['status'] = 'Unpaid';
            if (totalEarnings === 0) {
                status = 'No Payroll';
            } else if (remainingBalance <= 0) {
                status = 'Paid';
            }

            return {
                driverId: driver.id,
                driverName: driver.name,
                driverType: driver.type,
                totalSales,
                totalEarnings,
                amountPaid,
                remainingBalance,
                status,
                paymentsForPeriod
            };
        });
    }, [drivers, sales, payments, selectedDate, products]);

    const openPaymentModal = (payroll: CalculatedPayroll) => {
        setModalState({
            isOpen: true,
            driverId: payroll.driverId,
            driverName: payroll.driverName,
            remainingAmount: payroll.remainingBalance,
        });
    };
    
    const closePaymentModal = () => {
        setModalState({ isOpen: false, driverId: null, driverName: null, remainingAmount: 0 });
    };

    const handleConfirmPayment = (amount: number) => {
        if (modalState.driverId && modalState.driverName) {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            addPayment(modalState.driverId, periodKey, amount);
            
            setSuccessMessage(`Payment of ${formatCurrency(amount)} to ${modalState.driverName} has been recorded.`);
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
        }
        closePaymentModal();
    };
    
    const handleToggleRow = (driverId: string) => {
        setExpandedRowId(prevId => (prevId === driverId ? null : driverId));
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        name: new Date(0, i).toLocaleString('default', { month: 'long' })
    }));

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Payroll Management</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 p-4 bg-secondary/50 rounded-lg">
                        <div className="flex-1 space-y-1">
                            <label htmlFor="month-filter" className="text-sm font-medium">Month</label>
                            <Select
                                id="month-filter"
                                value={selectedDate.getMonth()}
                                onChange={(e) => handleDateChange('month', parseInt(e.target.value))}
                            >
                                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                            </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <label htmlFor="year-filter" className="text-sm font-medium">Year</label>
                            <Select
                                id="year-filter"
                                value={selectedDate.getFullYear()}
                                onChange={(e) => handleDateChange('year', parseInt(e.target.value))}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Driver</th>
                                    <th scope="col" className="px-6 py-3">Driver Type</th>
                                    <th scope="col" className="px-6 py-3">Total Sales</th>
                                    <th scope="col" className="px-6 py-3">Total Earnings</th>
                                    <th scope="col" className="px-6 py-3">Remaining Balance</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calculatedPayroll.length > 0 ? (
                                    calculatedPayroll.map((p) => (
                                        <Fragment key={p.driverId}>
                                            <tr className="border-b border-border">
                                                <td className="px-6 py-4 font-medium">{p.driverName}</td>
                                                <td className="px-6 py-4">{p.driverType}</td>
                                                <td className="px-6 py-4">{formatCurrency(p.totalSales)}</td>
                                                <td className="px-6 py-4">{formatCurrency(p.totalEarnings)}</td>
                                                <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{formatCurrency(p.remainingBalance > 0 ? p.remainingBalance : 0)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        p.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                        : p.status === 'Unpaid' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => openPaymentModal(p)}
                                                            disabled={p.remainingBalance <= 0}
                                                        >
                                                            Pay
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleToggleRow(p.driverId)} aria-expanded={expandedRowId === p.driverId}>
                                                            {expandedRowId === p.driverId ? 
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                                                : 
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                                                            }
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRowId === p.driverId && (
                                                <tr className="bg-secondary/20">
                                                    <td colSpan={7} className="p-0">
                                                        <div className="p-4 bg-background m-2 rounded-md border">
                                                            <h4 className="text-sm font-semibold mb-2 text-foreground/80">
                                                                Payment History for {months[selectedDate.getMonth()].name} {selectedDate.getFullYear()}
                                                            </h4>
                                                            {p.paymentsForPeriod.length > 0 ? (
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                    <tr className="border-b">
                                                                        <th className="text-left font-medium py-2 px-3">Payment Date</th>
                                                                        <th className="text-right font-medium py-2 px-3">Amount Paid</th>
                                                                    </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                    {p.paymentsForPeriod.map(payment => (
                                                                        <tr key={payment.id} className="border-b border-border/50 last:border-0">
                                                                            <td className="py-2 px-3">{new Date(payment.timestamp).toLocaleString()}</td>
                                                                            <td className="text-right py-2 px-3">{formatCurrency(payment.amount)}</td>
                                                                        </tr>
                                                                    ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <p className="text-center text-foreground/60 py-4 text-sm">No payments have been made in this period.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-foreground/60">
                                            No payroll data to display for this period. Add drivers to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <PaymentModal
                isOpen={modalState.isOpen}
                onClose={closePaymentModal}
                onConfirm={handleConfirmPayment}
                driverName={modalState.driverName || ''}
                remainingAmount={modalState.remainingAmount}
            />
            <SuccessModal
                isOpen={showSuccessModal}
                title="Payment Successful!"
                message={successMessage}
            />
        </>
    );
};

export default PayrollScreen;