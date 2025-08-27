import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { getLocalDateString, getStartOfDay, parseLocalDate } from '../lib/dateUtils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DashboardCard from '../components/DashboardCard';
import NumberInput from '../components/ui/NumberInput';
import { useDriverData } from '../hooks/useDriverData';
import { Product, Sale, DriverType, Location } from '../types';
import SaleConfirmationModal from '../components/SaleConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import Switch from '../components/ui/Switch';
import Select from '../components/ui/Select';

const DriverDashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { products, sales, addSale, drivers, schedule, locations, updateDriver, updateScheduleForDriverToday, updateDriverDailySetup } = useData();
    const [isSaving, setIsSaving] = useState(false);
    const [showStartingValuesSuccessModal, setShowStartingValuesSuccessModal] = useState(false);
    const { formatCurrency, settings } = useTheme();

    const driverDetails = useMemo(() => drivers.find(d => d.userId === user?.id), [drivers, user]);
    const { data: driverData, updateData: updateDriverData } = useDriverData(driverDetails?.id);

    const [isShiftActive, setIsShiftActive] = useState(() => {
        const savedShiftStatus = localStorage.getItem('driverShiftStatus');
        return savedShiftStatus ? JSON.parse(savedShiftStatus) : false;
    });
    
    const [cart, setCart] = useState<Record<string, number>>({}); // ProductID -> Quantity
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [showSaleSuccessModal, setShowSaleSuccessModal] = useState(false);
    
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [showLocationSuccessModal, setShowLocationSuccessModal] = useState(false);
    const todayDateStr = getLocalDateString();
    const today = parseLocalDate(todayDateStr);
    const todayString = today.toDateString();

    const todaysSales = useMemo(() => {
        if (!user || !driverDetails) return [];
        return sales.filter(s => s.driverId === driverDetails.id && new Date(s.timestamp).toDateString() === todayString)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sales, user, driverDetails, todayString]);

    const currentAssignment = useMemo(() => {
        if (!driverDetails) return null;

        if (driverDetails.type === DriverType.DEDICATED) {
            const todaySchedule = schedule.find(item => item.driverId === driverDetails.id && new Date(item.date).toDateString() === todayString);
            return todaySchedule ? { id: todaySchedule.locationId, name: todaySchedule.locationName } : null;
        }
        if (driverDetails.type === DriverType.MITRA) {
            const assignedLocation = locations.find(l => l.id === driverDetails.location);
            return assignedLocation ? { id: assignedLocation.id, name: assignedLocation.name } : null;
        }
        return null;
    }, [driverDetails, schedule, locations, todayString]);

    const occupiedLocationsToday = useMemo(() => {
        const occupied = new Set<string>();
        const todayStr = new Date().toDateString();

        // Get locations from OTHER Mitra drivers
        drivers.forEach(d => {
            if (d.id !== driverDetails?.id && d.type === DriverType.MITRA && d.location) {
                occupied.add(d.location);
            }
        });

        // Get locations from OTHER Dedicated drivers' schedule for today
        schedule.forEach(s => {
            if (s.driverId !== driverDetails?.id && new Date(s.date).toDateString() === todayStr) {
                occupied.add(s.locationId);
            }
        });
        
        return occupied;
    }, [drivers, schedule, driverDetails]);

    const availableLocations = useMemo(() => {
        return locations
            .filter(l => !occupiedLocationsToday.has(l.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [locations, occupiedLocationsToday]);
    
    const upcomingSchedule = useMemo(() => {
        if (!driverDetails) return [];

        const startDate = getStartOfDay();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        return schedule
            .filter(item => {
                const itemDate = new Date(item.date);
                return item.driverId === driverDetails.id && itemDate >= startDate && itemDate < endDate;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [schedule, driverDetails]);

    const todaysRevenue = useMemo(() => todaysSales.reduce((sum, s) => sum + s.total, 0), [todaysSales]);
    const itemsSold = useMemo(() => todaysSales.reduce((sum, s) => sum + s.quantity, 0), [todaysSales]);
    
    const estimatedCommission = useMemo(() => {
        return todaysSales.reduce((commission, sale) => {
            const product = products.find(p => p.id === sale.productId);
            return commission + (product ? product.commission * sale.quantity : 0);
        }, 0);
    }, [todaysSales, products]);

    const cartItems = useMemo(() => {
        return Object.entries(cart)
            .map(([productId, quantity]) => {
                const product = products.find(p => p.id === productId);
                return { product, quantity: quantity as number };
            })
            .filter(item => item.product && item.quantity > 0);
    }, [cart, products]);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            if (item.product) {
                return total + item.product.price * item.quantity;
            }
            return total;
        }, 0);
    }, [cartItems]);
    
    const handleCartQuantityChange = (productId: string, delta: number) => {
        setCart(prevCart => {
            const currentQuantity = prevCart[productId] || 0;
            const newQuantity = Math.max(0, currentQuantity + delta);

            if (newQuantity === 0) {
                const newCart = { ...prevCart };
                delete newCart[productId];
                return newCart;
            } else {
                return { ...prevCart, [productId]: newQuantity };
            }
        });
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prevCart => {
            const newCart = { ...prevCart };
            delete newCart[productId];
            return newCart;
        });
    };
    
    const handleClearCart = () => setCart({});

    const handleProceedToPayment = () => {
        if (Object.keys(cart).length === 0) return;
        setIsSaleModalOpen(true);
    };

    const handleConfirmSale = (paymentMethod: 'cash' | 'qris') => {
        if (Object.keys(cart).length === 0 || !driverDetails || !currentAssignment) return;
    
        const currentLocationName = currentAssignment.name;

        Object.entries(cart).forEach(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const saleData: Omit<Sale, 'id' | 'timestamp'> = {
                driverId: driverDetails.id,
                driverName: driverDetails.name,
                productId: product.id,
                productName: product.name,
                quantity: Number(quantity),
                total: product.price * Number(quantity),
                location: currentLocationName,
                paymentMethod: paymentMethod
            };
            addSale(saleData);
        });
        
        setCart({});
        setIsSaleModalOpen(false);
        setShowSaleSuccessModal(true);
        setTimeout(() => setShowSaleSuccessModal(false), 2000);
    };
    
     const handleLocationChangeConfirm = async () => {
        try {
            if (!selectedLocationId || !driverDetails) {
                throw new Error('Missing required data for location change');
            }

            if (driverDetails.type === DriverType.MITRA) {
                await updateDriver({ ...driverDetails, location: selectedLocationId });
            } else if (driverDetails.type === DriverType.DEDICATED) {
                await updateScheduleForDriverToday(driverDetails.id, selectedLocationId);
            }
            
            setIsEditingLocation(false);
            setShowLocationSuccessModal(true);
            setTimeout(() => setShowLocationSuccessModal(false), 2000);
        } catch (error) {
            console.error('Failed to change location:', error);
            alert('Failed to change location: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    // Reset shift status when component unmounts (e.g., on logout or navigation away)
    useEffect(() => {
        return () => {
            if (!user) {
                localStorage.removeItem('driverShiftStatus');
                setIsShiftActive(false);
            }
        };
    }, [user]);


    return (
        <>
            <div className="space-y-6 pb-20"> {/* Added padding bottom to accommodate sticky button */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <DashboardCard title="Today's Revenue" value={formatCurrency(todaysRevenue)} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.825-1.106-2.257 0-3.082C10.544 7.219 11.275 7 12 7c.725 0 1.45.22 2.003.659m-2.003 6v.008Z" /></svg>} />
                    {settings.showDriverItemsSold && (
                        <DashboardCard title="Items Sold" value={`${itemsSold}`} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>} />
                    )}
                    {settings.showDriverCommission && (
                         <DashboardCard title="Estimated Commission" value={formatCurrency(estimatedCommission)} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3.75a.75.75 0 0 0-.75.75v.75h18v-.75a.75.75 0 0 0-.75-.75h-16.5ZM2.25 8.25v9.75a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75V8.25a.75.75 0 0 0-.75-.75h-16.5a.75.75 0 0 0-.75.75Z" /></svg>} />
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between gap-4">
                                <CardTitle>Products</CardTitle>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${isShiftActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-sm font-medium text-secondary-foreground">{isShiftActive ? 'Shift Active' : 'Shift Inactive'}</span>
                                    </div>
                                    <Switch 
                                        checked={isShiftActive} 
                                        onChange={(value) => {
                                            setIsShiftActive(value);
                                            localStorage.setItem('driverShiftStatus', JSON.stringify(value));
                                        }} 
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <fieldset disabled={!isShiftActive || !currentAssignment} className="disabled:opacity-50 disabled:cursor-not-allowed">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {products.filter(p => p.status === 'active').map((product) => {
                                        const quantityInCart = cart[product.id] || 0;
                                        return (
                                            <Card key={product.id} className="flex flex-col">
                                                <img src={product.imageUrl} alt={product.name} className="w-full aspect-square object-cover rounded-t-lg" />
                                                <CardHeader className="pt-4 pb-2 flex-grow">
                                                    <CardTitle className="text-base leading-snug" title={product.name}>{product.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex flex-col justify-end">
                                                    <p className="font-semibold text-lg text-accent mb-4">{formatCurrency(product.price)}</p>
                                                    <div className="flex items-center justify-center space-x-3">
                                                        <Button variant="secondary" size="sm" className="px-3" onClick={() => handleCartQuantityChange(product.id, -1)} disabled={quantityInCart <= 0}>-</Button>
                                                        <span className="text-lg font-bold w-12 text-center">{quantityInCart}</span>
                                                        <Button variant="secondary" size="sm" className="px-3" onClick={() => handleCartQuantityChange(product.id, 1)}>+</Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    </div>
                                     {!currentAssignment && isShiftActive && (
                                        <div className="text-center py-10">
                                            <p className="font-semibold text-red-500">You are not assigned to any location today.</p>
                                            <p className="text-sm text-foreground/70">Please change your location in the "My Assignment" card before starting sales.</p>
                                        </div>
                                    )}
                                </fieldset>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="xl:col-span-2 space-y-6">
                         <Card className="bg-gradient-to-br from-card to-accent/5">
                            <CardHeader className="cursor-pointer select-none" onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Driver Settings</CardTitle>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        strokeWidth={1.5} 
                                        stroke="currentColor" 
                                        className={`w-5 h-5 transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {currentAssignment ? `Current Location: ${currentAssignment.name}` : 'No location assigned'}
                                </p>
                            </CardHeader>
                            {isSettingsExpanded && (
                                <CardContent className="p-6">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="coconutsCarried" className="text-sm font-medium text-foreground/70 block mb-2">
                                                        Coconuts Carried
                                                    </label>
                                                    <NumberInput 
                                                        id="coconutsCarried"
                                                        value={driverData?.coconutsCarried || 0}
                                                        onChange={(value) => updateDriverData({ coconutsCarried: value })}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="changeAmount" className="text-sm font-medium text-foreground/70 block mb-2">
                                                        Change Amount
                                                    </label>
                                                    <NumberInput 
                                                        id="changeAmount"
                                                        value={driverData?.changeAmount || 0}
                                                        onChange={(value) => updateDriverData({ changeAmount: value })}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={async () => {
                                                    if (!driverDetails?.id) return;
                                                    try {
                                                        setIsSaving(true);
                                                        await updateDriverDailySetup(
                                                            driverDetails.id,
                                                            driverData.coconutsCarried || 0,
                                                            driverData.changeAmount || 0
                                                        );
                                                        setShowStartingValuesSuccessModal(true);
                                                        setTimeout(() => setShowStartingValuesSuccessModal(false), 2000);
                                                    } catch (err) {
                                                        console.error('Error saving starting values:', err);
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                                className="w-full"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Saving...' : 'Save Starting Values'}
                                            </Button>
                                        </div>

                                        {isEditingLocation ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-4">Select Location</h3>
                                                    <Select 
                                                        id="location" 
                                                        value={selectedLocationId} 
                                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                                        className="w-full"
                                                    >
                                                        <option value="" disabled>Choose a new location...</option>
                                                        {availableLocations.map(loc => (
                                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                        ))}
                                                    </Select>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        onClick={() => setIsEditingLocation(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        onClick={handleLocationChangeConfirm} 
                                                        disabled={!selectedLocationId}
                                                    >
                                                        Confirm Change
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground/70 mb-2">Current Assignment</h3>
                                                <button 
                                                    onClick={() => { 
                                                        if (currentAssignment) {
                                                            setIsEditingLocation(true); 
                                                            setSelectedLocationId(currentAssignment.id);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${currentAssignment ? 'hover:bg-accent/10 active:bg-accent/20 cursor-pointer' : 'cursor-default'}`}
                                                    disabled={!currentAssignment}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent flex-shrink-0">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                                    </svg>
                                                    <span className="font-semibold text-lg">
                                                        {currentAssignment ? currentAssignment.name : 'Unassigned'}
                                                    </span>
                                                    {currentAssignment && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1 text-accent/70">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                         <Card>
                            <CardHeader>
                                <CardTitle>Current Transaction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {cartItems.length > 0 ? cartItems.map(({ product, quantity }) => product && (
                                        <div key={product.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-foreground/70">{formatCurrency(product.price)} x {quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{formatCurrency(product.price * quantity)}</p>
                                                <button onClick={() => handleRemoveFromCart(product.id)} className="p-1 text-red-500 hover:text-red-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center text-foreground/60 py-8">Cart is empty. Add products to start a sale.</p>
                                    )}
                                </div>
                            </CardContent>
                            {cartItems.length > 0 && (
                                <CardFooter className="flex-col items-stretch space-y-4 pt-4 mt-4 border-t">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{formatCurrency(cartTotal)}</span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            variant="secondary" 
                                            onClick={handleClearCart}
                                            className="flex items-center gap-2"
                                            title="Clear Cart"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                            <span className="sr-only">Clear Cart</span>
                                        </Button>
                                        <Button 
                                            onClick={handleProceedToPayment} 
                                            disabled={!isShiftActive || !currentAssignment}
                                            className="flex items-center gap-2"
                                            title="Proceed to Payment"
                                        >
                                            <span>Pay</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                            </svg>
                                        </Button>
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Today's Sales Log</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-y-auto max-h-[400px] relative">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-secondary sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3">Qty</th>
                                                <th className="px-4 py-3">Total</th>
                                                <th className="px-4 py-3">Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {todaysSales.length > 0 ? todaysSales.map((sale: Sale) => (
                                                <tr key={sale.id} className="border-b border-border">
                                                    <td className="px-4 py-3 font-medium">{sale.productName}</td>
                                                    <td className="px-4 py-3">{sale.quantity}</td>
                                                    <td className="px-4 py-3">{formatCurrency(sale.total)}</td>
                                                    <td className="px-4 py-3 capitalize">{sale.paymentMethod}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className="text-center py-8 text-foreground/60">No sales recorded today.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                        {settings.showDriverSchedule && driverDetails?.type === DriverType.DEDICATED && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>My 7-Day Schedule</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {upcomingSchedule.length > 0 ? (
                                        <ul className="space-y-3">
                                            {upcomingSchedule.map(item => (
                                                <li key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-secondary/50 rounded-lg">
                                                    <div className="font-medium">
                                                        <span className="font-bold">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>, {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                                    </div>
                                                    <div className="text-foreground/80 flex items-center gap-2 mt-1 sm:mt-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                                        {item.locationName}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-foreground/60 py-4">No schedule has been generated for you for the upcoming week.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Left and Deposit Summary Card */}
                <Card className="bg-gradient-to-br from-card/50 to-accent/5">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Today's Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Left: {driverData?.coconutsCarried - itemsSold || 0} coconuts
                            </div>
                            <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a.272.272 0 01-.35.25A49.043 49.043 0 001.75 14.5z" clipRule="evenodd" />
                                </svg>
                                Deposit: {formatCurrency(todaysRevenue + (driverData?.changeAmount || 0))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {cartItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg z-50">
                    <div className="container mx-auto flex items-center justify-between">
                        <div className="font-bold text-lg">
                            <span>Total: {formatCurrency(cartTotal)}</span>
                        </div>
                        <Button 
                            onClick={handleProceedToPayment} 
                            disabled={!isShiftActive || !currentAssignment}
                            className="flex items-center gap-2"
                            size="lg"
                        >
                            <span>Pay Now</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                            </svg>
                        </Button>
                    </div>
                </div>
            )}
            <SaleConfirmationModal
                isOpen={isSaleModalOpen}
                onClose={() => setIsSaleModalOpen(false)}
                cart={cart}
                products={products}
                onConfirm={handleConfirmSale}
            />
            <SuccessModal 
                isOpen={showSaleSuccessModal}
                title="Sale Recorded!"
                message="The transaction has been successfully saved."
            />
             <SuccessModal 
                isOpen={showLocationSuccessModal}
                title="Location Updated!"
                message="Your location has been successfully changed."
            />
            <SuccessModal 
                isOpen={showStartingValuesSuccessModal}
                title="Values Saved!"
                message="Your starting values have been successfully saved."
            />
        </>
    );
};

export default DriverDashboardScreen;