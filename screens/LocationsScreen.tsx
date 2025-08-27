import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Location, LocationCategory } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import LocationForm from '../components/LocationForm';

const LocationsScreen: React.FC = () => {
    const { locations, deleteLocation, sales } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

    const locationPerformance = useMemo(() => {
        const salesByLocation: Record<string, number> = {};
        sales.forEach(sale => {
            salesByLocation[sale.location] = (salesByLocation[sale.location] || 0) + 1;
        });

        const maxTransactions = Math.max(0, ...Object.values(salesByLocation));

        return locations.map(location => {
            const transactions = salesByLocation[location.name] || 0;
            const score = maxTransactions > 0 ? (transactions / maxTransactions) * 100 : 0;
            return {
                ...location,
                transactions,
                score,
            };
        }).sort((a, b) => b.transactions - a.transactions);
    }, [locations, sales]);

    const openFormModal = (location: Location | null) => {
        setEditingLocation(location);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingLocation(null);
    };

    const handleDeleteClick = (locationId: string) => {
        setLocationToDelete(locationId);
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setLocationToDelete(null);
        setIsConfirmModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (locationToDelete) {
            deleteLocation(locationToDelete);
        }
        closeConfirmModal();
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Manage Locations</CardTitle>
                    <Button onClick={() => openFormModal(null)}>Add Location</Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Location Name</th>
                                    <th scope="col" className="px-6 py-3">Category</th>
                                    <th scope="col" className="px-6 py-3">Activity Score</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locationPerformance.length > 0 ? (
                                    locationPerformance.map((location) => (
                                        <tr key={location.id} className="border-b border-border">
                                            <td className="px-6 py-4 font-medium">{location.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    location.category === LocationCategory.DAILY_ROTATION 
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                                }`}>
                                                    {location.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                                                    <div className="w-full max-w-[200px] bg-secondary rounded-full h-2.5">
                                                        <div
                                                            className="bg-accent h-2.5 rounded-full"
                                                            style={{ width: `${location.score}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-medium text-foreground/80 sm:min-w-[70px]">{location.transactions} transactions</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 space-x-2 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openFormModal(location)}>Edit</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(location.id)}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-foreground/60">
                                            No locations found. Get started by adding a new location.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={editingLocation ? 'Edit Location' : 'Add Location'}>
                <LocationForm location={editingLocation} onSave={closeFormModal} />
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={handleConfirmDelete}
                title="Delete Location"
                message="Are you sure you want to delete this location? This action cannot be undone."
            />
        </>
    );
};

export default LocationsScreen;