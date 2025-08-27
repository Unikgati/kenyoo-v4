import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { 
  Product, 
  Driver, 
  Sale, 
  Location, 
  Schedule, 
  Payment, 
  CompanySettings,
  DriverType,
  LocationCategory
} from '../types';
import { getLocalDateString, getStartOfDay, getEndOfDay } from '../lib/dateUtils';
import { Database } from '../lib/database.types';
import { supabase } from '../lib/supabaseClient';
import { MOCK_SETTINGS } from '../lib/mockData';
import { useAuth } from './AuthContext';
import { 
  storeData, 
  addPendingAction, 
  markDataSynced, 
  getAllData,
  getUnsynedSales,
  batchMarkSalesSynced,
  getUnsynedData,
  getAllSalesSorted,
  Syncable,
  syncLocalWithServer,
  getData,
  getUnsynedActions,
  markActionSynced
} from '../lib/indexedDB';

interface DataContextType {
  products: Product[];
  drivers: Driver[];
  sales: Sale[];
  locations: Location[];
  schedule: Schedule[];
  payments: Payment[];
  settings: CompanySettings | null;
  loading: boolean;
  error: any;
  refreshData: () => Promise<void>;
  // CRUD operations
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addDriver: (driverData: Omit<Driver, 'id' | 'userId'>, userCredentials: { email: string; password: string }) => Promise<void>;
  updateDriver: (driver: Driver) => Promise<void>;
  addSale: (saleData: Omit<Sale, 'id' | 'timestamp'>) => Promise<void>;
  addLocation: (location: Omit<Location, 'id'>) => Promise<void>;
  updateLocation: (location: Location) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  generateSchedule: (options: { rotationInterval: number; excludedDays: number[] }) => Promise<void>;
  updateScheduleForDriverToday: (driverId: string, newLocationId: string) => Promise<void>;
  clearSchedule: () => Promise<void>;
  addPayment: (driverId: string, period: string, amount: number) => Promise<void>;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  factoryReset: () => Promise<void>;
  updateDriverStartingValues: (driverId: string, coconutsCarried: number, changeAmount: number) => Promise<void>;
  driverDailySetup: Database['public']['Tables']['driver_daily_setup']['Row'][];
  updateDriverDailySetup: (driverId: string, coconutsCarried: number, changeAmount: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session, user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [driverDailySetup, setDriverDailySetup] = useState<Database['public']['Tables']['driver_daily_setup']['Row'][]>([]);

  const loadSettings = async () => {
    try {
        // Coba ambil dari IndexedDB dulu
        const offlineSettings = await getAllData('settings');
        if (offlineSettings?.[0]) {
            setSettings(offlineSettings[0]);
            return;
        }

        // Jika tidak ada di IndexedDB dan online, coba ambil dari Supabase
        if (navigator.onLine) {
            const { data: settingsData, error: settingsError } = await supabase
                .from('settings')
                .select('*')
                .single();

            if (!settingsError && settingsData) {
                setSettings(settingsData);
                // Simpan ke IndexedDB
                await storeData('settings', settingsData);
            } else if (!settingsError) {
                // Jika tidak ada settings, gunakan default
                const defaultSettings = { ...MOCK_SETTINGS, id: crypto.randomUUID() };
                setSettings(defaultSettings);
                await storeData('settings', defaultSettings);
            }
        }
    } catch (err) {
        console.error('Error loading settings:', err);
        // Fallback ke mock settings
        setSettings(MOCK_SETTINGS);
    }
};

const loadFromIndexedDB = async () => {
    if (!session) return;
    
    console.log("Loading data from IndexedDB...");
    try {
      const [
        offlineProducts,
        offlineDrivers,
        offlineSales,
        offlineLocations,
        offlineSchedule,
        offlinePayments,
      ] = await Promise.all([
        getAllData('products'),
        getAllData('drivers'),
        getAllData('sales'),
        getAllData('locations'),
        getAllData('schedule'),
        getAllData('payments'),
      ]);

      console.log("Data loaded from IndexedDB");

      // Set initial state from IndexedDB
      if (offlineProducts?.length > 0) setProducts(offlineProducts);
      if (offlineDrivers?.length > 0) setDrivers(offlineDrivers);
      if (offlineSales?.length > 0) setSales(offlineSales);
      if (offlineLocations?.length > 0) setLocations(offlineLocations);
      if (offlineSchedule?.length > 0) setSchedule(offlineSchedule);
      if (offlinePayments?.length > 0) setPayments(offlinePayments);
    } catch (err) {
      console.warn('Failed to load from IndexedDB:', err);
    }
  };

  const updateIndexedDB = async (data: {
    products?: Product[],
    drivers?: Driver[],
    sales?: Sale[],
    locations?: Location[],
    schedule?: Schedule[],
    payments?: Payment[],
    settings?: CompanySettings
  }) => {
    try {
      const promises = [];
      
      if (data.products) {
        promises.push(...data.products.map(p => storeData('products', p)));
      }
      if (data.drivers) {
        promises.push(...data.drivers.map(d => storeData('drivers', d)));
      }
      if (data.sales) {
        // Untuk sales, jangan update yang belum tersinkron
        const unsyncedSales = await getUnsynedSales();
        const unsyncedIds = new Set(unsyncedSales.map(s => s.id));
        const salesToUpdate = data.sales.filter(s => !unsyncedIds.has(s.id));
        promises.push(...salesToUpdate.map(s => storeData('sales', { ...s, synced: true })));
      }
      if (data.locations) {
        promises.push(...data.locations.map(l => storeData('locations', l)));
      }
      if (data.schedule) {
        promises.push(...data.schedule.map(s => storeData('schedule', s)));
      }
      if (data.payments) {
        // Untuk payments, jangan update yang belum tersinkron
        const unsyncedPayments = await getUnsynedData('payments');
        const unsyncedIds = new Set(unsyncedPayments.map(p => p.id));
        const paymentsToUpdate = data.payments.filter(p => !unsyncedIds.has(p.id));
        promises.push(...paymentsToUpdate.map(p => storeData('payments', { ...p, synced: true })));
      }
      if (data.settings) {
        promises.push(storeData('settings', data.settings));
      }

      await Promise.all(promises);
      console.log("IndexedDB updated successfully");
    } catch (err) {
      console.error("Failed to update IndexedDB:", err);
    }
  };

  const fetchAllData = async () => {
    console.log("DataProvider: fetchAllData started. Session user:", session?.user?.email);
    setLoading(true);
    setError(null);

    try {
      // Step 1: Try to load data from IndexedDB first
      await loadFromIndexedDB();

      // Step 2: If online and has session, fetch and update from Supabase
      if (navigator.onLine && session) {
        console.log("Online, fetching from Supabase...");
        
        const [
          { data: productsData, error: productsError },
          { data: driversData, error: driversError },
          { data: salesData, error: salesError },
          { data: locationsData, error: locationsError },
          { data: scheduleData, error: scheduleError },
          { data: paymentsData, error: paymentsError },
          { data: settingsData, error: settingsError },
          { data: setupData, error: setupError }
        ] = await Promise.all([
          supabase.from('products').select('*').order('name', { ascending: true }),
          supabase.from('drivers').select('*').order('name', { ascending: true }),
          supabase.from('sales').select('*').order('timestamp', { ascending: false }),
          supabase.from('locations').select('*').order('name', { ascending: true }),
          supabase.from('schedule').select('*').order('date', { ascending: true }),
          supabase.from('payments').select('*').order('timestamp', { ascending: false }),
          supabase.from('settings').select('*').single(),
          supabase.from('driver_daily_setup').select('*')
            .order('date', { ascending: false })
        ]);

        // Throw any errors except PGRST116 (no rows) for settings
        if (productsError) throw productsError;
        if (driversError) throw driversError;
        if (salesError) throw salesError;
        if (locationsError) throw locationsError;
        if (scheduleError) throw scheduleError;
        if (paymentsError) throw paymentsError;
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        if (setupError) throw setupError;

        if (setupData) setDriverDailySetup(setupData);

        // Update state with merged data from Supabase and unsynced local data
        if (productsData) setProducts(productsData);
        if (driversData) setDrivers(driversData);

        // For sales, ensure we have all sales from both sources
        if (salesData) {
          // Clean up local sales that don't exist on the server anymore
          await syncLocalWithServer('sales', salesData.map(s => s.id));
          
          // Get all local sales after cleanup
          const localSales = await getAllSalesSorted();
          const onlineSaleIds = new Set(salesData.map(s => s.id));
          
          // Find sales that exist locally but not in Supabase
          const localOnlySales = localSales.filter(s => !onlineSaleIds.has(s.id));
          
          // Combine and sort all sales
          const mergedSales = [
            ...localOnlySales,
            ...salesData.map(s => ({ ...s, synced: true }))
          ].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          console.log('Total sales after merge:', mergedSales.length, 
            '(Local:', localOnlySales.length, 
            'Online:', salesData.length, ')');
          
          setSales(mergedSales);
        }

        if (locationsData) setLocations(locationsData);
        if (scheduleData) setSchedule(scheduleData);

        // For payments, similar to sales
        if (paymentsData) {
          // Clean up local payments that don't exist on the server anymore
          await syncLocalWithServer('payments', paymentsData.map(p => p.id));
          
          const unsyncedPayments = await getUnsynedData('payments');
          const unsyncedIds = new Set(unsyncedPayments.map(p => p.id));
          const mergedPayments = [
            ...unsyncedPayments,
            ...paymentsData.filter(p => !unsyncedIds.has(p.id))
          ];
          setPayments(mergedPayments);
        }

        // Handle settings specially
        if (settingsData) {
          setSettings(settingsData);
        } else {
          // If no settings exist in DB, insert the default ones
          const { data: newSettings, error: insertError } = await supabase.from('settings')
            .insert({ ...MOCK_SETTINGS, id: crypto.randomUUID() })
            .select()
            .single();
          if (insertError) throw insertError;
          if (newSettings) setSettings(newSettings);
        }

        // Update IndexedDB with fresh data
        console.log("Updating IndexedDB with fresh data from Supabase...");
        await updateIndexedDB({
          products: productsData || undefined,
          drivers: driversData || undefined,
          sales: salesData || undefined,
          locations: locationsData || undefined,
          schedule: scheduleData || undefined,
          payments: paymentsData || undefined,
          settings: settingsData || undefined
        });
      } else if (!session) {
        // If no session, clear all protected data except settings
        console.log("DataProvider: no session, clearing protected data.");
        setProducts([]);
        setDrivers([]);
        setSales([]);
        setLocations([]);
        setSchedule([]);
        setPayments([]);
        // Settings are intentionally not cleared here to preserve branding
      }

    } catch (err: any) {
        setError(err);
        console.error("Error fetching data:", err.message || err);
        // Fallback to mock settings if the fetch fails, to prevent app crash
        if (!settings) {
            setSettings(MOCK_SETTINGS);
        }
    } finally {
        console.log("DataProvider: fetchAllData finished.");
        setLoading(false);
    }
  };
  
  // Load settings immediately when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // This effect ensures that data fetching only happens *after* the authentication
    // state is fully resolved. This prevents race conditions on page load.
    if (authLoading) {
      console.log("DataProvider: Auth is still loading, waiting.");
      return;
    }
    
    console.log("DataProvider: Auth has loaded, proceeding to fetch data.");
    const initialize = async () => {
      await fetchAllData();
      if (navigator.onLine && session) {
        console.log("Online on startup, syncing pending sales...");
        await syncSales();
      }
    };
    
    initialize();
    
  }, [user?.id, authLoading]); // Depend on user.id (stable) and authLoading


  // Products
  const addProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: crypto.randomUUID() };
    const { data, error } = await supabase.from('products').insert(newProduct).select().single();
    if (error) throw error;
    if (data) setProducts(prev => [data, ...prev]);
  };
  const updateProduct = async (updatedProduct: Product) => {
    const { id, ...updateData } = updatedProduct;
    const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    if (data) setProducts(prev => prev.map(p => p.id === data.id ? data : p));
  };
  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Drivers
  const addDriver = async (driverData: Omit<Driver, 'id' | 'userId'>, userCredentials: { email: string, password: string }) => {
    const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email: userCredentials.email,
        password: userCredentials.password,
        options: {
            data: { name: driverData.name, role: 'driver' }
        }
    });

    if (signUpError) throw new Error(`Failed to create user account: ${signUpError.message}`);
    if (!newUser) throw new Error('User account creation did not return a user.');
    
    const newDriverRecord = {
        id: crypto.randomUUID(),
        ...driverData,
        userId: newUser.id,
    };
    
    const { data: driverProfile, error: driverError } = await supabase.from('drivers').insert(newDriverRecord).select().single();
    if (driverError) {
      console.error('CRITICAL: User was created but profile creation failed. Manual cleanup needed for user ID:', newUser.id);
      throw new Error(`User created, but failed to create driver profile: ${driverError.message}`);
    }
    
    if (driverProfile) setDrivers(prev => [driverProfile, ...prev]);
  };
  const updateDriver = async (updatedDriver: Driver) => {
    const { id, name, type, contact, status, location } = updatedDriver;
    const updatePayload = { name, type, contact, status, location };

    try {
      // Update in IndexedDB first
      await storeData('drivers', updatedDriver);
      
      // Optimistic update
      setDrivers(prev => prev.map(d => d.id === id ? updatedDriver : d));

      // Add to pending actions
      await addPendingAction('update', 'drivers', updatedDriver);

      // If online, try to update Supabase
      if (navigator.onLine && session) {
        const { error } = await supabase.from('drivers').update(updatePayload).eq('id', id);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error updating driver:', err);
      // Revert optimistic update if operation failed
      const originalDriver = await getData('drivers', id);
      if (originalDriver) {
        setDrivers(prev => prev.map(d => d.id === id ? originalDriver : d));
      }
      throw err;
    }
  };
  
  // Sales
  const syncSales = async () => {
    if (!navigator.onLine || !session) {
      console.log('Skipping sync: offline or no session');
      return;
    }

    try {
      // Get all unsynced sales from IndexedDB
      const unsyncedSales = await getUnsynedSales();
      console.log('Checking for unsynced sales...', 
        unsyncedSales.length ? `Found ${unsyncedSales.length} unsynced sales` : 'No unsynced sales');
      
      if (unsyncedSales.length === 0) return;

      console.log('Starting sync for sales:', unsyncedSales.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        total: s.total
      })));

      // Try to sync each sale with Supabase
      const syncPromises = unsyncedSales.map(async (sale) => {
        try {
          const { data, error } = await supabase
            .from('sales')
            .insert({
              id: sale.id,
              driverId: sale.driverId,
              driverName: sale.driverName,
              productId: sale.productId,
              productName: sale.productName,
              quantity: sale.quantity,
              total: sale.total,
              timestamp: sale.timestamp,
              location: sale.location,
              paymentMethod: sale.paymentMethod
            })
            .select()
            .single();

          if (error) {
            console.error('Error syncing sale:', sale.id, error);
            return null;
          }

          return sale.id;
        } catch (err) {
          console.error('Error syncing sale:', sale.id, err);
          return null;
        }
      });

      // Wait for all sync attempts to complete
      const syncedIds = (await Promise.all(syncPromises)).filter((id): id is string => id !== null);

      // Mark successfully synced sales
      if (syncedIds.length > 0) {
        await batchMarkSalesSynced(syncedIds);
        console.log('Successfully synced sales:', syncedIds.length);
      }
    } catch (err) {
      console.error('Error in syncSales:', err);
    }
  };

  const syncPendingActions = async () => {
    if (!navigator.onLine || !session) {
      return;
    }

    try {
      const pendingActions = await getUnsynedActions();
      if (pendingActions.length === 0) return;

      console.log(`Starting sync for ${pendingActions.length} pending actions...`);

      for (const action of pendingActions) {
        try {
          switch (action.action) {
            case 'update':
              switch (action.table) {
                case 'drivers':
                  const driverData = action.data as Driver;
                  const { id: driverId, name, type, contact, status, location } = driverData;
                  await supabase.from('drivers')
                    .update({ name, type, contact, status, location })
                    .eq('id', driverId);
                  break;

                case 'schedule':
                  const scheduleData = action.data as Schedule;
                  await supabase.from('schedule')
                    .update({ 
                      locationId: scheduleData.locationId,
                      locationName: scheduleData.locationName 
                    })
                    .eq('id', scheduleData.id);
                  break;
              }
              break;
          }

          // Mark action as synced
          await markActionSynced(action.id);
          console.log(`Successfully synced action: ${action.id}`);

        } catch (err) {
          console.error(`Error syncing action ${action.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error in syncPendingActions:', err);
    }
  };

  // Start sync process when coming online
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Device is online, starting sync...');
      await syncSales();
      await syncPendingActions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session]);

  // Try to sync periodically when online
  useEffect(() => {
    if (!navigator.onLine || !session) return;

    const syncAll = async () => {
      // Sync sales first
      await syncSales();
      // Then sync other pending actions
      await syncPendingActions();
    };

    // Immediate sync attempt when effect runs
    syncAll();
    
    // Then set up interval for periodic sync
    const syncInterval = setInterval(syncAll, 5000); // Try sync more frequently (every 5 seconds)
    return () => clearInterval(syncInterval);
  }, [session, navigator.onLine]); // Also depend on online status

  const addSale = async (saleData: Omit<Sale, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const newSale: Sale & Syncable = {
      ...saleData,
      id: crypto.randomUUID(),
      timestamp,
      synced: false
    };

    try {
      // Always store in IndexedDB first
      await storeData('sales', newSale);
      
      // Update local state
      setSales(prev => [newSale, ...prev]);

      // Try to sync immediately if online
      if (navigator.onLine && session) {
        const { error } = await supabase.from('sales').insert({
          id: newSale.id,
          driverId: newSale.driverId,
          driverName: newSale.driverName,
          productId: newSale.productId,
          productName: newSale.productName,
          quantity: newSale.quantity,
          total: newSale.total,
          timestamp: newSale.timestamp,
          location: newSale.location,
          paymentMethod: newSale.paymentMethod
        });

        if (!error) {
          // If sync successful, mark as synced in IndexedDB
          await markDataSynced('sales', newSale.id);
          // Update local state to reflect synced status
          setSales(prev => prev.map(s => 
            s.id === newSale.id ? { ...s, synced: true } : s
          ));
        } else {
          console.error('Error syncing new sale:', error);
        }
      }
    } catch (err) {
      console.error('Error adding sale:', err);
      throw err;
    }
  };

  // Locations
  const addLocation = async (location: Omit<Location, 'id'>) => {
    const newLocation = { ...location, id: crypto.randomUUID() };
    const { data, error } = await supabase.from('locations').insert(newLocation).select().single();
    if (error) throw error;
    if (data) setLocations(prev => [data, ...prev]);
  };
  const updateLocation = async (updatedLocation: Location) => {
    const { id, name, category } = updatedLocation;
    const updateData = { name, category }; // Only include fields that are part of the table.
    const { data, error } = await supabase.from('locations').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    if (data) setLocations(prev => prev.map(l => l.id === data.id ? data : l));
  };
  const deleteLocation = async (locationId: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', locationId);
    if (error) throw error;
    setLocations(prev => prev.filter(l => l.id !== locationId));
  };

  // Schedule
  const generateSchedule = async (options: { rotationInterval: number; excludedDays: number[] }) => {
    const { rotationInterval, excludedDays } = options;
    const activeDedicatedDrivers = drivers.filter(d => d.status === 'active' && d.type === DriverType.DEDICATED);
    const availableLocations = locations.filter(l => l.category === LocationCategory.DAILY_ROTATION);
    if (activeDedicatedDrivers.length === 0 || availableLocations.length === 0) {
        alert("No active dedicated drivers or schedulable locations available.");
        return;
    }

    const newScheduleItems: Schedule[] = [];
    const driverLocationIndices = new Map<string, number>();
    activeDedicatedDrivers.forEach((driver, index) => driverLocationIndices.set(driver.id, index));
    
    let daysScheduled = 0;
    let currentDate = getStartOfDay(); // Start from today's local date at 00:00
    while (daysScheduled < 30) {
        const dayOfWeek = currentDate.getDay();
        if (!excludedDays.includes(dayOfWeek)) {
            activeDedicatedDrivers.forEach(driver => {
                const driverStartIndex = driverLocationIndices.get(driver.id)!;
                const locationDayIndex = Math.floor(daysScheduled / rotationInterval);
                const locationIndex = (driverStartIndex + locationDayIndex) % availableLocations.length;
                const location = availableLocations[locationIndex];
                newScheduleItems.push({
                    id: crypto.randomUUID(),
                    driverId: driver.id,
                    driverName: driver.name,
                    date: getLocalDateString(currentDate),
                    locationId: location.id,
                    locationName: location.name,
                });
            });
            daysScheduled++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const { error: deleteError } = await supabase.from('schedule').delete().in('driverId', activeDedicatedDrivers.map(d => d.id));
    if (deleteError) throw deleteError;

    const { data, error: insertError } = await supabase.from('schedule').insert(newScheduleItems).select();
    if (insertError) throw insertError;

     const { data: scheduleData, error: scheduleError } = await supabase.from('schedule').select('*').order('date', { ascending: true });
     if (scheduleError) throw scheduleError;
     setSchedule(scheduleData || []);
  };
  
  const updateScheduleForDriverToday = async (driverId: string, newLocationId: string) => {
    console.log('updateScheduleForDriverToday called with:', { driverId, newLocationId });
    
    const todayISO = getLocalDateString(); // Using our custom date function
    console.log('Today ISO:', todayISO);
    
    const newLocation = locations.find(l => l.id === newLocationId);
    if (!newLocation) {
      console.error('Location not found:', { newLocationId, availableLocations: locations });
      throw new Error('Selected location not found');
    }

    try {
      // Find the current schedule item
      const currentSchedule = schedule.find(s => s.driverId === driverId && s.date === todayISO);
      console.log('Current schedule found:', currentSchedule);
      
      if (!currentSchedule) {
        console.error('No schedule found for today:', { driverId, todayISO, allSchedules: schedule });
        throw new Error('No schedule found for today');
      }

      // Create updated schedule item
      const updatedSchedule: Schedule = {
        ...currentSchedule,
        locationId: newLocation.id,
        locationName: newLocation.name
      };
      console.log('Created updated schedule:', updatedSchedule);

      // Store in IndexedDB first
      await storeData('schedule', updatedSchedule);
      console.log('Stored in IndexedDB');

      // Optimistic update
      setSchedule(prev => prev.map(item => {
        const isMatch = item.driverId === driverId && item.date === todayISO;
        return isMatch ? updatedSchedule : item;
      }));
      console.log('Updated local state');

      // Add to pending actions
      await addPendingAction('update', 'schedule', updatedSchedule);
      console.log('Added to pending actions');

      // If online, try to update Supabase
      if (navigator.onLine && session) {
        console.log('Online and session exists, updating Supabase...');
        const { error } = await supabase.from('schedule')
          .update({ locationId: newLocation.id, locationName: newLocation.name })
          .eq('driverId', driverId)
          .eq('date', todayISO);

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        console.log('Supabase update successful');
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      
      // Revert optimistic update
      const originalSchedule = schedule.find(s => s.driverId === driverId && s.date === todayISO);
      if (originalSchedule) {
        setSchedule(prev => prev.map(item => {
          const isMatch = item.driverId === driverId && item.date === todayISO;
          return isMatch ? originalSchedule : item;
        }));
      }
      
      // Re-throw the error to be handled by the UI
      throw err;
    }
  };

  const clearSchedule = async () => {
    const { error } = await supabase.from('schedule').delete().neq('id', '0'); // A way to delete all rows
    if (error) throw error;
    setSchedule([]);
  };

  // Payments (for Payroll)
  const addPayment = async (driverId: string, period: string, amount: number) => {
    const newPayment = { id: crypto.randomUUID(), driverId, period, amount, timestamp: new Date().toISOString() };
    const { data, error } = await supabase.from('payments').insert(newPayment).select().single();
    if (error) throw error;
    if (data) setPayments(prev => [data, ...prev]);
  };

  // Settings
  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    if (!settings) return;
    const { id, ...updateData } = newSettings;
    const { data, error } = await supabase.from('settings').update(updateData).eq('id', settings.id).select().single();
    if (error) throw error;
    if (data) setSettings(data as CompanySettings);
  };

  const factoryReset = async () => {
    console.warn("Factory Reset is not implemented for Supabase backend from the client. Please truncate tables in the Supabase dashboard.");
  };

  const updateDriverStartingValues = async (driverId: string, coconutsCarried: number, changeAmount: number) => {
    const today = getStartOfDay();
    const tomorrow = getEndOfDay();

    // Create a new "starting values" record for today
    const newSale: Omit<Sale, 'id'> = {
        driverId,
        driverName: drivers.find(d => d.id === driverId)?.name || '',
        productId: 'starting_values',
        productName: 'Starting Values',
        quantity: 0,
        total: 0,
        location: 'n/a',
        paymentMethod: 'cash',
        timestamp: today.toISOString(),

    };

    try {
        // Delete any existing starting values for today
        await supabase
            .from('sales')
            .delete()
            .eq('driverId', driverId)
            .eq('productId', 'starting_values')
            .gte('timestamp', today.toISOString())
            .lt('timestamp', tomorrow.toISOString());

        // Insert new starting values
        const { data, error } = await supabase
            .from('sales')
            .insert({
                ...newSale,
                id: crypto.randomUUID()
            })
            .select()
            .single();

        if (error) throw error;
        if (data) setSales(prev => [data, ...prev]);
    } catch (err) {
        console.error('Error updating driver starting values:', err);
        throw err;
    }
  };

  const updateDriverDailySetup = async (driverId: string, coconutsCarried: number, changeAmount: number) => {
    const todayStr = getLocalDateString();
    const driverName = drivers.find(d => d.id === driverId)?.name || '';

    try {
      // Delete any existing setup for today
      await supabase
        .from('driver_daily_setup')
        .delete()
        .eq('driver_id', driverId)
        .eq('date', todayStr);

      // Insert new setup
      const { data, error } = await supabase
        .from('driver_daily_setup')
        .insert({
          driver_id: driverId,
          driver_name: driverName,
          date: todayStr,
          coconuts_carried: coconutsCarried,
          change_amount: changeAmount
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      if (data) {
        setDriverDailySetup(prev => {
          const filtered = prev.filter(item => 
            !(item.driver_id === driverId && item.date === todayStr)
          );
          return [data, ...filtered];
        });
      }
    } catch (err) {
      console.error('Error updating driver daily setup:', err);
      throw err;
    }
  };

  return (
    <DataContext.Provider value={{ 
        products, drivers, sales, locations, schedule, payments, settings,
        loading, error,
        addProduct, updateProduct, deleteProduct, 
        addDriver, updateDriver, 
        addSale, 
        addLocation, updateLocation, deleteLocation,
        generateSchedule, updateScheduleForDriverToday, clearSchedule,
        addPayment,
        updateSettings,
        factoryReset,
        updateDriverStartingValues,
        driverDailySetup,
        updateDriverDailySetup,
        refreshData: fetchAllData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
