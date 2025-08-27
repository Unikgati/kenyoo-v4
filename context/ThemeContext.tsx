import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { CompanySettings, ThemeColors } from '../types';
import { hexToHSL } from '../lib/utils';
import { useData } from './DataContext';

// Default settings moved from mockData.ts to here
const DEFAULT_SETTINGS: CompanySettings = {
    id: 'drivesell-settings',
    name: "",
    logoUrl: "https://tailwindui.com/img/logos/mark.svg?color=white",
    faviconUrl: "https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500",
    icon192Url: "https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500",
    icon512Url: "https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500",
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

interface ThemeContextType {
  settings: CompanySettings;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;
  resetSettings: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  formatCurrency: (value: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings: dataSettings, updateSettings: updateDataSettings } = useData();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Use settings from data context, but fall back to default settings if not loaded yet
  const settings = dataSettings || DEFAULT_SETTINGS;

  const applyTheme = useCallback((themeSettings: CompanySettings, isDark: boolean) => {
    const theme = themeSettings.theme as unknown as ThemeColors;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.setProperty('--color-primary', hexToHSL('#111827'));
      root.style.setProperty('--color-primary-foreground', hexToHSL(theme.background));
      root.style.setProperty('--color-accent', '210 40% 98%'); 
      root.style.setProperty('--color-secondary', hexToHSL('#1f2937'));
      root.style.setProperty('--color-secondary-foreground', hexToHSL('#f9fafb'));
      root.style.setProperty('--color-background', hexToHSL('#111827'));
      root.style.setProperty('--color-card', hexToHSL('#1f2937'));
      root.style.setProperty('--color-foreground', hexToHSL(theme.background));
      root.style.setProperty('--color-card-foreground', hexToHSL(theme.background));
      root.style.setProperty('--color-border', hexToHSL('#374151'));
      root.style.setProperty('--color-input', hexToHSL('#374151'));
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--color-primary', hexToHSL(theme.primary));
      root.style.setProperty('--color-primary-foreground', hexToHSL(theme.background));
      root.style.setProperty('--color-accent', hexToHSL(theme.primary));
      root.style.setProperty('--color-secondary', hexToHSL(theme.secondary));
      root.style.setProperty('--color-secondary-foreground', hexToHSL(theme.primary));
      root.style.setProperty('--color-background', hexToHSL(theme.background));
      root.style.setProperty('--color-foreground', hexToHSL(theme.foreground));
      root.style.setProperty('--color-card', hexToHSL(theme.background));
      root.style.setProperty('--color-card-foreground', hexToHSL(theme.foreground));
      root.style.setProperty('--color-border', hexToHSL(theme.secondary));
      root.style.setProperty('--color-input', hexToHSL(theme.secondary));
    }
  }, []);

  useEffect(() => {
    if (settings) {
        // Apply theme colors
        applyTheme(settings, isDarkMode);
        
        // Update favicon
        const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (favicon && settings.faviconUrl) {
          favicon.href = settings.faviconUrl;
        }
        
        // Update iOS icons
        const iconUrl = settings.icon192Url || settings.icon512Url || settings.faviconUrl;
        if (iconUrl) {
          const appleIcon = document.querySelector<HTMLLinkElement>("#apple-touch-icon");
          const appleIcon152 = document.querySelector<HTMLLinkElement>("#apple-touch-icon-152");
          const appleIcon167 = document.querySelector<HTMLLinkElement>("#apple-touch-icon-167");
          
          if (appleIcon) appleIcon.href = iconUrl;
          if (appleIcon152) appleIcon152.href = iconUrl;
          if (appleIcon167) appleIcon167.href = iconUrl;
        }
        
        // Update manifest with current settings
        updateManifest(settings);
    }
  }, [settings, isDarkMode, applyTheme]);

  const updateManifest = (settings: CompanySettings) => {
    const manifest = {
        name: settings.name || "Driver Sales Monitoring",
        short_name: "Sales Monitor",
        description: "Monitor and manage driver sales and performance",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
            {
                src: settings.icon192Url || "icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
            },
            {
                src: settings.icon512Url || "icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ]
    };

    // Update manifest file
    const manifestString = JSON.stringify(manifest, null, 2);
    const blob = new Blob([manifestString], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    
    // Update manifest link in head
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestURL;
};

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    updateDataSettings(newSettings);
    updateManifest(newSettings as CompanySettings);
  };

  const resetSettings = () => {
    const { id, ...defaultDataWithoutId } = DEFAULT_SETTINGS;
    updateDataSettings(defaultDataWithoutId);
  };
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const formatCurrency = useCallback((value: number) => {
      const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: settings.currency,
        minimumFractionDigits: ['IDR', 'JPY'].includes(settings.currency) ? 0 : 2,
        maximumFractionDigits: ['IDR', 'JPY'].includes(settings.currency) ? 0 : 2,
      };

      let locale = 'en-US';
      if (settings.currency === 'IDR') locale = 'id-ID';
      if (settings.currency === 'EUR') locale = 'de-DE';
      if (settings.currency === 'JPY') locale = 'ja-JP';

      return new Intl.NumberFormat(locale, options).format(value);
  }, [settings.currency]);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resetSettings, isDarkMode, toggleDarkMode, formatCurrency }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
