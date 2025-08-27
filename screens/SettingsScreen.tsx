
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { CompanySettings, ThemeColors } from '../types';
import Select from '../components/ui/Select';
import Switch from '../components/ui/Switch';
import SuccessModal from '../components/SuccessModal';
import FactoryResetModal from '../components/FactoryResetModal';

const SettingsScreen: React.FC = () => {
    const { settings, updateSettings, resetSettings } = useTheme();
    const { factoryReset } = useData();
    const { logout } = useAuth();
    const [localSettings, setLocalSettings] = useState<CompanySettings>(settings);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSwitchChange = (name: keyof CompanySettings, checked: boolean) => {
        setLocalSettings(prev => ({ ...prev, [name]: checked }));
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            theme: { ...(prev.theme as unknown as ThemeColors), [name]: value }
        }));
    };

    const handleSave = () => {
        updateSettings(localSettings);
        setShowSuccessModal(true);
        setTimeout(() => {
            setShowSuccessModal(false);
        }, 2000);
    };

    const handleConfirmReset = async (password: string): Promise<string | void> => {
        // In a real app, this would be a secure API call.
        // For this demo, we use a hardcoded password.
        if (password === 'password123') {
            factoryReset();
            resetSettings();
            // A short delay might feel better before logout, but is not necessary
            logout();
            return;
        } else {
            return "Incorrect password. Please try again.";
        }
    };


    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Branding & Visual Customization</CardTitle>
                        <CardDescription>Customize the look and feel of your application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="name">Company Name</label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={localSettings.name}
                                    onChange={handleInputChange}
                                />
                            </div>
                             <div className="space-y-2">
                                <label htmlFor="logoUrl">Logo URL</label>
                                <Input
                                    id="logoUrl"
                                    name="logoUrl"
                                    value={localSettings.logoUrl}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="faviconUrl">Favicon URL (16x16)</label>
                                <Input
                                    id="faviconUrl"
                                    name="faviconUrl"
                                    value={localSettings.faviconUrl}
                                    onChange={handleInputChange}
                                    placeholder="URL for browser favicon (16x16 px)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="icon192Url">App Icon URL (192x192)</label>
                                <Input
                                    id="icon192Url"
                                    name="icon192Url"
                                    value={localSettings.icon192Url}
                                    onChange={handleInputChange}
                                    placeholder="URL for mobile app icon (192x192 px)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="icon512Url">App Icon URL (512x512)</label>
                                <Input
                                    id="icon512Url"
                                    name="icon512Url"
                                    value={localSettings.icon512Url}
                                    onChange={handleInputChange}
                                    placeholder="URL for mobile app icon (512x512 px)"
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium mb-4">Color Theme (Light Mode)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <ColorPicker
                                    label="Primary"
                                    name="primary"
                                    value={(localSettings.theme as unknown as ThemeColors).primary}
                                    onChange={handleColorChange}
                                />
                                <ColorPicker
                                    label="Secondary"
                                    name="secondary"
                                    value={(localSettings.theme as unknown as ThemeColors).secondary}
                                    onChange={handleColorChange}
                                />
                                 <ColorPicker
                                    label="Background"
                                    name="background"
                                    value={(localSettings.theme as unknown as ThemeColors).background}
                                    onChange={handleColorChange}
                                />
                                <ColorPicker
                                    label="Text / Foreground"
                                    name="foreground"
                                    value={(localSettings.theme as unknown as ThemeColors).foreground}
                                    onChange={handleColorChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>System Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2 max-w-xs">
                            <label htmlFor="currency">Currency</label>
                            <Select id="currency" name="currency" value={localSettings.currency} onChange={handleInputChange}>
                                <option value="IDR">Indonesian Rupiah (IDR)</option>
                                <option value="USD">United States Dollar (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                                <option value="JPY">Japanese Yen (JPY)</option>
                            </Select>
                        </div>
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <label htmlFor="showDriverCommission" className="font-medium">Show Estimated Commission on Driver Dashboard</label>
                                    <p className="text-sm text-foreground/70">If disabled, drivers will not see their estimated commission.</p>
                                </div>
                                <Switch
                                    id="showDriverCommission"
                                    checked={localSettings.showDriverCommission}
                                    onChange={(checked) => handleSwitchChange('showDriverCommission', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <label htmlFor="showDriverItemsSold" className="font-medium">Show Items Sold on Driver Dashboard</label>
                                    <p className="text-sm text-foreground/70">If disabled, drivers will not see the total items they have sold today.</p>
                                </div>
                                <Switch
                                    id="showDriverItemsSold"
                                    checked={localSettings.showDriverItemsSold}
                                    onChange={(checked) => handleSwitchChange('showDriverItemsSold', checked)}
                                />
                            </div>
                             <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <label htmlFor="showDriverSchedule" className="font-medium">Show 7-Day Schedule on Driver Dashboard</label>
                                    <p className="text-sm text-foreground/70">If enabled, drivers will see their upcoming work locations.</p>
                                </div>
                                <Switch
                                    id="showDriverSchedule"
                                    checked={localSettings.showDriverSchedule}
                                    onChange={(checked) => handleSwitchChange('showDriverSchedule', checked)}
                                />
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Button onClick={handleSave}>Save System Configs</Button>
                    </CardFooter>
                </Card>

                <Card className="border-red-500/50">
                     <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => setIsResetModalOpen(true)}>Factory Reset</Button>
                        <p className="text-sm text-foreground/70 mt-2">Permanently delete all data and restore settings to default. This action cannot be undone.</p>
                    </CardContent>
                </Card>
            </div>
            <SuccessModal
                isOpen={showSuccessModal}
                title="Settings Saved!"
                message="Your changes have been successfully applied."
            />
            <FactoryResetModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleConfirmReset}
            />
        </>
    );
};


interface ColorPickerProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const ColorPicker: React.FC<ColorPickerProps> = ({ label, name, value, onChange }) => (
    <div className="space-y-2">
        <label htmlFor={name} className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2 border border-input rounded-md p-2">
            <input
                type="color"
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className="w-8 h-8 rounded border-none cursor-pointer p-0"
                style={{ backgroundColor: value }}
            />
            <Input
                type="text"
                value={value}
                onChange={onChange}
                name={name}
                className="border-none focus-visible:ring-0"
            />
        </div>
    </div>
);


export default SettingsScreen;
