import { Product, Driver, Sale, Location, DriverType, User, CompanySettings, Payroll } from '../types';

export const MOCK_USERS: User[] = [
    { id: 'user-admin-1', username: 'admin', email: 'admin@example.com', role: 'admin', name: 'Admin User', password: 'password123' },
];

export const MOCK_PRODUCTS: Product[] = [];

export const MOCK_LOCATIONS: Location[] = [];

export const MOCK_DRIVERS: Driver[] = [];

export const MOCK_SALES: Sale[] = [];

export const MOCK_SETTINGS: CompanySettings = {
    id: 'drivesell-settings',
    name: "",
    logoUrl: "https://tailwindui.com/img/logos/mark.svg?color=white",
    faviconUrl: "https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500",
    theme: {
        primary: '#111827', // dark gray
        secondary: '#f3f4f6', // light gray
        foreground: '#1f2937', // text color
        background: '#ffffff', // white
    },
    currency: 'IDR',
    showDriverCommission: true,
    showDriverItemsSold: true,
    showDriverSchedule: true,
};