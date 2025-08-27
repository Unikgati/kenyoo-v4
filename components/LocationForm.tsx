import React, { useState, useEffect } from 'react';
import { Location, LocationCategory } from '../types';
import { useData } from '../context/DataContext';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';

interface LocationFormProps {
  location: Location | null;
  onSave: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ location, onSave }) => {
  const { addLocation, updateLocation } = useData();
  const [formData, setFormData] = useState<Omit<Location, 'id'>>({
    name: '',
    category: LocationCategory.DAILY_ROTATION,
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        category: location.category,
      });
    } else {
      setFormData({
        name: '',
        category: LocationCategory.DAILY_ROTATION,
      });
    }
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        alert("Location name cannot be empty.");
        return;
    }
    
    if (location) {
      updateLocation({ ...location, ...formData });
    } else {
      addLocation(formData);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-1">Location Name</label>
        <Input 
            id="name" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            autoFocus
        />
      </div>
       <div>
        <label htmlFor="category" className="block text-sm font-medium text-foreground/80 mb-1">Location Category</label>
        <Select id="category" name="category" value={formData.category} onChange={handleChange}>
          <option value={LocationCategory.DAILY_ROTATION}>Daily Rotation (Included in auto-schedule)</option>
          <option value={LocationCategory.SPECIAL_EVENT}>Special/Event (Excluded from auto-schedule)</option>
        </Select>
      </div>
      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="secondary" onClick={onSave}>Cancel</Button>
        <Button type="submit">Save Location</Button>
      </div>
    </form>
  );
};

export default LocationForm;
