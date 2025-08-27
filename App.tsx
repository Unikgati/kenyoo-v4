
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import LoginScreen from './screens/LoginScreen';
import LoadingSpinner from './components/ui/LoadingSpinner';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardScreen from './screens/DashboardScreen';
import ProductsScreen from './screens/ProductsScreen';
import DriversScreen from './screens/DriversScreen';
import SettingsScreen from './screens/SettingsScreen';
import DriverDashboardScreen from './screens/DriverDashboardScreen';
import LocationsScreen from './screens/LocationsScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import PayrollScreen from './screens/PayrollScreen';
import ReportsScreen from './screens/ReportsScreen';
import DriverReportsScreen from './screens/DriverReportsScreen';

type AdminScreen = 'dashboard' | 'products' | 'drivers' | 'locations' | 'schedule' | 'payroll' | 'reports' | 'driver-reports' | 'settings';

const AdminLayout: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<AdminScreen>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const handleSetActiveScreen = (screen: AdminScreen) => {
        setActiveScreen(screen);
        setIsSidebarOpen(false); // Close sidebar on navigation
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'dashboard': return <DashboardScreen />;
            case 'products': return <ProductsScreen />;
            case 'drivers': return <DriversScreen />;
            case 'locations': return <LocationsScreen />;
            case 'schedule': return <ScheduleScreen />;
            case 'payroll': return <PayrollScreen />;
            case 'reports': return <ReportsScreen />;
            case 'driver-reports': return <DriverReportsScreen />;
            case 'settings': return <SettingsScreen />;
            default: return <DashboardScreen />;
        }
    };

    return (
        <div className="flex h-screen bg-background">
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/60 z-30 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            <Sidebar 
                activeScreen={activeScreen} 
                setActiveScreen={handleSetActiveScreen}
                isSidebarOpen={isSidebarOpen} 
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary/50 p-6">
                    {renderScreen()}
                </main>
            </div>
        </div>
    );
};

const DriverLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-background">
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary/50 p-6">
                    <DriverDashboardScreen />
                </main>
            </div>
        </div>
    );
};


const AppContent: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) {
        return <LoginScreen />;
    }
    
    if (user.role === 'admin') {
        return <AdminLayout />;
    }

    if (user.role === 'driver') {
        return <DriverLayout />;
    }

    // Fallback for user with no role or during brief transition
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <LoadingSpinner size="lg" />
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <DataProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </DataProvider>
    </AuthProvider>
  );
};

export default App;
