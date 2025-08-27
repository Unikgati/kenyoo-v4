import React, { useState, useEffect } from 'react';
import { Driver, DriverType } from '../types';
import { useData } from '../context/DataContext';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import LoadingSpinner from './ui/LoadingSpinner';

interface DriverFormProps {
  driver: Driver | null;
  onSave: () => void;
}

const DriverForm: React.FC<DriverFormProps> = ({ driver, onSave }) => {
  const { addDriver, updateDriver, locations } = useData();

  const [formData, setFormData] = useState<Omit<Driver, 'id' | 'userId'>>({
    name: '',
    type: DriverType.DEDICATED,
    contact: '',
    status: 'active',
    location: null,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name,
        type: driver.type,
        contact: driver.contact,
        status: driver.status,
        location: driver.location,
      });
      // Email is not editable for existing drivers in this form for simplicity
      setEmail('');
      setPassword('');
    } else {
      setFormData({
        name: '',
        type: DriverType.DEDICATED,
        contact: '',
        status: 'active',
        location: null,
      });
      setEmail('');
      setPassword('');
    }
    setError(null);
    setIsLoading(false);
  }, [driver]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        location: value === DriverType.DEDICATED ? null : prev.location 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (driver) { // Editing existing driver
        await updateDriver({ ...driver, ...formData });
      } else { // Adding new driver
        if (!email) {
          throw new Error('Email is required to create a login for the new driver.');
        }
        if (!password) {
            throw new Error('An initial password is required for the new driver.');
        }
        await addDriver(formData, { email, password });
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-1">Driver Name</label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-foreground/80 mb-1">Contact</label>
          <Input id="contact" name="contact" value={formData.contact} onChange={handleChange} required />
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="type" className="block text-sm font-medium text-foreground/80 mb-1">Driver Type</label>
            <Select id="type" name="type" value={formData.type} onChange={handleTypeChange}>
              <option value={DriverType.DEDICATED}>Dedicated</option>
              <option value={DriverType.MITRA}>Mitra</option>
            </Select>
        </div>
        <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
            <Select id="status" name="status" value={formData.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
        </div>
      </div>
      
      {formData.type === DriverType.MITRA && (
        <div>
            <label htmlFor="location" className="block text-sm font-medium text-foreground/80 mb-1">Location</label>
            <Select id="location" name="location" value={formData.location || ''} onChange={handleChange} required>
                <option value="" disabled>Select a location</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </Select>
        </div>
      )}
      
      {!driver && (
        <div className="pt-4">
          <h4 className="text-md font-semibold mb-2 text-foreground/90">Driver Login Credentials</h4>
          <p className="text-sm text-foreground/70 mb-3">Create a login for the new driver. You will need to share the password with them directly.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1">Driver's Email</label>
              <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1">Initial Password</label>
              <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
        </div>
      )}
        
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="secondary" onClick={onSave}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Saving...</span>
            </div>
          ) : (
            'Save Driver'
          )}
        </Button>
      </div>
    </form>
  );
};

export default DriverForm;
