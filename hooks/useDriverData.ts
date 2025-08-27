import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getLocalDateString } from '../lib/dateUtils';

interface DriverData {
    coconutsCarried: number;
    changeAmount: number;
}

const DRIVER_DATA_KEY = 'driverData';

export const useDriverData = (driverId: string | undefined) => {
    const { driverDailySetup } = useData();
    const [data, setData] = useState<DriverData>({
        coconutsCarried: 0,
        changeAmount: 0,
    });

    // Load data from Supabase/localStorage when component mounts
    useEffect(() => {
        if (!driverId) return;
        
        // Coba ambil data hari ini dari Supabase terlebih dahulu
        const todayStr = getLocalDateString();
        const setupData = driverDailySetup.find(
            setup => setup.driver_id === driverId && setup.date === todayStr
        );

        // Hapus data localStorage yang lama
        localStorage.removeItem(`${DRIVER_DATA_KEY}_${driverId}`);
        
        if (setupData) {
            // Jika ada data di Supabase, gunakan itu
            setData({
                coconutsCarried: setupData.coconuts_carried,
                changeAmount: setupData.change_amount,
            });
            // Simpan ke localStorage dengan timestamp
            localStorage.setItem(`${DRIVER_DATA_KEY}_${driverId}`, JSON.stringify({
                coconutsCarried: setupData.coconuts_carried,
                changeAmount: setupData.change_amount,
                date: todayStr // Tambahkan tanggal
            }));
        } else {
            // Reset data ke nilai default
            setData({
                coconutsCarried: 0,
                changeAmount: 0,
            });
        }
    }, [driverId, driverDailySetup]); // Tambahkan driverDailySetup sebagai dependency

    // Save data to localStorage whenever it changes
    const updateData = (newData: Partial<DriverData>) => {
        if (!driverId) return;

        const updatedData = { ...data, ...newData };
        setData(updatedData);
        localStorage.setItem(`${DRIVER_DATA_KEY}_${driverId}`, JSON.stringify(updatedData));
    };

    return {
        data,
        updateData,
    };
};
