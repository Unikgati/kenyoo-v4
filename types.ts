import { Database, Json } from './lib/database.types';

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  role: 'admin' | 'driver';
  name: string;
}

export type Product = Database['public']['Tables']['products']['Row'];

export const DriverType = {
  DEDICATED: 'Dedicated',
  MITRA: 'Mitra',
} as const;

export type DriverType = (typeof DriverType)[keyof typeof DriverType];

export type Driver = Database['public']['Tables']['drivers']['Row'];

export type BaseSale = Database['public']['Tables']['sales']['Row'];

export type Sale = BaseSale;

export const LocationCategory = {
  DAILY_ROTATION: 'Daily Rotation',
  SPECIAL_EVENT: 'Special/Event',
} as const;

export type LocationCategory = (typeof LocationCategory)[keyof typeof LocationCategory];


export type Location = Database['public']['Tables']['locations']['Row'];

export type Schedule = Database['public']['Tables']['schedule']['Row'];

export interface Payroll {
    id: string;
    driverId: string;
    driverName: string;
    periodStart: Date;
    periodEnd: Date;
    baseSalary: number;
    commission: number;
    bonus: number;
    total: number;
    status: 'pending' | 'paid';
}

export type Payment = Database['public']['Tables']['payments']['Row'];

export interface ThemeColors {
  primary: string;
  secondary: string;
  foreground: string;
  background: string;
}

export interface CompanySettings {
    id: string;
    name: string;
    logoUrl: string;
    faviconUrl: string;
    icon192Url: string;
    icon512Url: string;
    theme: Json;
    currency: string;
    showDriverCommission: boolean;
    showDriverItemsSold: boolean;
    showDriverSchedule: boolean;
}