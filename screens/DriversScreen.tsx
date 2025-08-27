import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Driver, DriverType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DriverForm from '../components/DriverForm';
import StarRating from '../components/StarRating';

const DriversScreen: React.FC = () => {
    const { drivers, locations, sales } = useData();
    const { formatCurrency } = useTheme();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const driversWithPerformance = useMemo(() => {
        const salesByDriver = sales.reduce<Record<string, number>>((acc, sale) => {
            acc[sale.driverId] = (acc[sale.driverId] || 0) + sale.total;
            return acc;
        }, {});

        const maxRevenue = Math.max(...Object.values(salesByDriver), 0);

        return drivers.map(driver => {
            const totalRevenue = salesByDriver[driver.id] || 0;
            const rating = maxRevenue > 0 ? Math.round((totalRevenue / maxRevenue) * 5) : 0;
            return {
                ...driver,
                totalRevenue,
                rating,
            };
        }).sort((a, b) => b.rating - a.rating || b.totalRevenue - a.totalRevenue);
    }, [drivers, sales]);

    const openFormModal = (driver: Driver | null) => {
        setEditingDriver(driver);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingDriver(null);
    };


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Manage Drivers</CardTitle>
                    <Button onClick={() => openFormModal(null)}>Add Driver</Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Type</th>
                                    <th scope="col" className="px-6 py-3">Performance Rating</th>
                                    <th scope="col" className="px-6 py-3">Location</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {driversWithPerformance.length > 0 ? (
                                    driversWithPerformance.map((driver) => {
                                        const locationDisplay = driver.type === DriverType.DEDICATED
                                            ? 'As Per Schedule'
                                            : locations.find(l => l.id === driver.location)?.name || 'N/A';

                                        return (
                                            <tr key={driver.id} className="border-b border-border">
                                                <td className="px-6 py-4 font-medium">{driver.name}</td>
                                                <td className="px-6 py-4">{driver.type}</td>
                                                <td className="px-6 py-4">
                                                    <StarRating 
                                                        rating={driver.rating}
                                                        tooltip={`Rating: ${driver.rating}/5 | Total Revenue: ${formatCurrency(driver.totalRevenue)}`}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">{locationDisplay}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        driver.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                        {driver.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 space-x-2 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => openFormModal(driver)}>Edit</Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-foreground/60">
                                            No drivers found. Get started by adding a new driver.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={editingDriver ? 'Edit Driver' : 'Add Driver'}>
                <DriverForm driver={editingDriver} onSave={closeFormModal} />
            </Modal>
        </>
    );
};

export default DriversScreen;