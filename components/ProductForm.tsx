import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useData } from '../context/DataContext';
import Input from './ui/Input';
import NumberInput from './ui/NumberInput';
import Button from './ui/Button';
import Select from './ui/Select';

interface ProductFormProps {
  product: Product | null;
  onSave: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave }) => {
  const { addProduct, updateProduct } = useData();
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    commission: 0,
    imageUrl: '',
    status: 'active',
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({ name: '', price: 0, commission: 0, imageUrl: 'https://res.cloudinary.com/dkwzjccok/image/upload/v1755756381/1062056d-ed24-4004-8be0-b4ed47c35360_tbezse.webp', status: 'active' });
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pastikan price dan commission adalah number yang valid
      const dataToSubmit = {
        ...formData,
        price: Math.max(0, parseInt(String(formData.price)) || 0),
        commission: Math.max(0, parseInt(String(formData.commission)) || 0)
      };

      if (product) {
        await updateProduct({ ...product, ...dataToSubmit });
      } else {
        await addProduct(dataToSubmit);
      }
      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please check the values and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-1">Product Name</label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-foreground/80 mb-1">Price</label>
          <Input 
            type="number"
            min="0"
            id="price" 
            name="price" 
            value={formData.price} 
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              price: parseInt(e.target.value) || 0 
            }))}
            required 
          />
        </div>
        <div>
          <label htmlFor="commission" className="block text-sm font-medium text-foreground/80 mb-1">Commission</label>
          <Input 
            type="number"
            min="0"
            id="commission" 
            name="commission" 
            value={formData.commission} 
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              commission: parseInt(e.target.value) || 0 
            }))}
            required 
          />
        </div>
      </div>
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-foreground/80 mb-1">Image URL</label>
        <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} required />
      </div>
       <div>
        <label htmlFor="status" className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
        <Select id="status" name="status" value={formData.status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="secondary" onClick={onSave}>Cancel</Button>
        <Button type="submit">Save Product</Button>
      </div>
    </form>
  );
};

export default ProductForm;