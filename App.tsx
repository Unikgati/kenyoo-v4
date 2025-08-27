
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import LocationDashboardScreen from './screens/LocationDashboardScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import PayrollScreen from './screens/PayrollScreen';
import ReportsScreen from './screens/ReportsScreen';
import DriverReportsScreen from './screens/DriverReportsScreen';

type AdminScreen = 'dashboard' | 'products' | 'drivers' | 'locations' | 'schedule' | 'payroll' | 'reports' | 'driver-reports' | 'settings';

const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const getActiveScreen = (path: string): AdminScreen => {
        if (path.startsWith('/dashboard')) return 'dashboard';
        if (path.startsWith('/products')) return 'products';
        if (path.startsWith('/drivers')) return 'drivers';
        if (path.startsWith('/locations')) return 'locations';
        if (path.startsWith('/schedule')) return 'schedule';
        if (path.startsWith('/payroll')) return 'payroll';
        if (path.startsWith('/reports')) return 'reports';
        if (path.startsWith('/driver-reports')) return 'driver-reports';
        if (path.startsWith('/settings')) return 'settings';
        return 'dashboard';
    };

    const handleSetActiveScreen = (screen: AdminScreen) => {
        const path = '/' + screen.toLowerCase();
        navigate(path);
        setIsSidebarOpen(false);
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
                activeScreen={getActiveScreen(location.pathname)} 
                setActiveScreen={handleSetActiveScreen}
                isSidebarOpen={isSidebarOpen} 
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary/50 p-6">
                        <Routes>
                        <Route path="/" element={<DashboardScreen />} />
                        <Route path="/dashboard" element={<DashboardScreen />} />
                        <Route path="/products" element={<ProductsScreen />} />
                        <Route path="/drivers" element={<DriversScreen />} />
                        <Route path="/locations" element={<LocationsScreen />} />
                        <Route path="/locations/:locationId" element={<LocationDashboardScreen />} />
                        <Route path="/schedule" element={<ScheduleScreen />} />
                        <Route path="/payroll" element={<PayrollScreen />} />
                        <Route path="/reports" element={<ReportsScreen />} />
                        <Route path="/driver-reports" element={<DriverReportsScreen />} />
                        <Route path="/settings" element={<SettingsScreen />} />
                    </Routes>
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
    <BrowserRouter>
        <AuthProvider>
            <DataProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </DataProvider>
        </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
