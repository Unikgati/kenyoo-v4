import { useState, useEffect } from 'react';
import { Driver } from '../types';
import { supabase } from '../lib/supabaseClient';
import { storeData, getData, addPendingAction } from '../lib/indexedDB';
import { useAuth } from '../context/AuthContext';

export const useDriverStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'active' | 'inactive'>('inactive');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
      if (!user) return;

      let cachedDriver: Driver | undefined;
      try {
        setLoading(true);
        setError(null);

        // Try to get status from IndexedDB first
        cachedDriver = await getData('drivers', user.id);
        if (cachedDriver) {
          setStatus(cachedDriver.status);
          setLoading(false);
        }

        // If online, fetch from Supabase and update cache
        if (isOnline) {
          const { data: driver, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('userId', user.id)
            .single();

          if (error) throw error;

          if (driver) {
            setStatus(driver.status);
            // Update local cache with full driver data
            await storeData('drivers', driver);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load driver status');
        // If we have cached data, we can continue using it
        if (!cachedDriver) {
          setStatus('inactive');
        }
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [user, isOnline]);

  const updateStatus = async (newStatus: 'active' | 'inactive') => {
    if (!user) return;

    try {
      setError(null);
      setStatus(newStatus); // Optimistic update

      // Get existing driver data first
      const existingDriver = await getData('drivers', user.id);
      if (!existingDriver) {
        throw new Error('Driver not found');
      }

      // Update driver with new status
      const updatedDriver: Driver = {
        ...existingDriver,
        status: newStatus
      };

      // Store in IndexedDB immediately
      await storeData('drivers', updatedDriver);

      // Add to pending actions for sync
      await addPendingAction('update', 'drivers', updatedDriver);

      // If online, try to update Supabase immediately
      if (isOnline) {
        const { error } = await supabase
          .from('drivers')
          .update({ status: newStatus })
          .eq('userId', user.id);

        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      // Revert optimistic update if operation failed
      setStatus(status);
    }
  };

  return {
    status,
    loading,
    error,
    isOnline,
    updateStatus
  };
};
