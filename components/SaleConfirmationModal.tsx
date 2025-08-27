import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import NumberInput from './ui/NumberInput';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface SaleConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentMethod: 'cash' | 'qris') => void;
    cart: Record<string, number>; // ProductID -> quantity
    products: Product[];
}

const SaleConfirmationModal: React.FC<SaleConfirmationModalProps> = ({ isOpen, onClose, onConfirm, cart, products }) => {
    const { formatCurrency } = useTheme();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [cashReceived, setCashReceived] = useState<number | ''>('');

    const total = useMemo(() => {
        return Object.entries(cart).reduce((sum, [productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            if (!product) return sum;
            const price = +(product.price as number);
            return sum + (price * (quantity as number));
        }, 0);
    }, [cart, products]);
    
    const change = useMemo(() => {
        if (paymentMethod === 'cash' && typeof cashReceived === 'number' && cashReceived >= total) {
            return cashReceived - total;
        }
        return null;
    }, [cashReceived, total, paymentMethod]);

    const isConfirmDisabled = useMemo(() => {
        if (paymentMethod === 'qris') {
            return false;
        }
        return cashReceived === '' || cashReceived < total;
    }, [paymentMethod, cashReceived, total]);


    const handleConfirm = () => {
        if (isConfirmDisabled) return;
        onConfirm(paymentMethod);
    };
    
    const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCashReceived(value === '' ? '' : parseFloat(value) || 0);
    };
    
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
              setPaymentMethod('cash');
              setCashReceived('');
            }, 150);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Sale`}>
            <div className="space-y-6">
                <div className="p-4 bg-secondary rounded-lg">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {Object.entries(cart).map(([productId, quantity]) => {
                            const product = products.find(p => p.id === productId);
                            if (!product) return null;
                            return (
                                <div key={productId} className="flex justify-between items-center text-sm">
                                    <span className="text-foreground/80">{product.name} &times;{quantity}</span>
                                    <span className="font-medium text-secondary-foreground">
                                        {formatCurrency(+(product.price as number) * (quantity as number))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t font-bold">
                        <span className="text-secondary-foreground">Total Price:</span>
                        <span className="text-accent">{formatCurrency(total)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={cn('p-4 rounded-lg border text-center transition-colors', paymentMethod === 'cash' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-secondary')}>
                            Cash
                        </button>
                        <button
                             onClick={() => setPaymentMethod('qris')}
                            className={cn('p-4 rounded-lg border text-center transition-colors', paymentMethod === 'qris' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-secondary')}>
                            QRIS
                        </button>
                    </div>
                </div>

                {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="cashReceived" className="block text-sm font-medium text-foreground/80 mb-1">Cash Received</label>
                            <NumberInput
                                id="cashReceived"
                                name="cashReceived"
                                placeholder={`Enter amount (e.g., ${Math.ceil(total)})`}
                                value={cashReceived === '' ? 0 : cashReceived}
                                onChange={(value) => setCashReceived(value)}
                            />
                            {cashReceived !== '' && cashReceived < total && (
                                <p className="text-sm text-red-500 mt-1">Cash received is less than the total amount.</p>
                            )}
                        </div>
                        {change !== null && (
                            <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
                                <p className="text-sm text-green-700 dark:text-green-300">Change to give back:</p>
                                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(change)}</p>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end pt-4 space-x-2 border-t border-border mt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleConfirm} disabled={isConfirmDisabled}>Confirm Sale</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SaleConfirmationModal;