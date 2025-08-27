import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import NumberInput from './ui/NumberInput';
import { useTheme } from '../context/ThemeContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  driverName: string;
  remainingAmount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, driverName, remainingAmount }) => {
    const { formatCurrency } = useTheme();
    const [amount, setAmount] = useState<number | ''>('');

    useEffect(() => {
        if (isOpen) {
            setAmount(remainingAmount > 0 ? remainingAmount : '');
        } else {
            // Add a small delay to prevent UI flicker during closing animation
            setTimeout(() => setAmount(''), 150);
        }
    }, [isOpen, remainingAmount]);

    const handleConfirm = () => {
        if (typeof amount === 'number' && amount > 0 && amount <= remainingAmount) {
            onConfirm(amount);
        }
    };

    const isInvalid = typeof amount !== 'number' || amount <= 0 || amount > remainingAmount;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pay Salary for ${driverName}`}>
            <div className="space-y-6">
                <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-secondary-foreground/70">Amount Due</p>
                    <p className="text-3xl font-bold text-accent">{formatCurrency(remainingAmount)}</p>
                </div>
                <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-foreground/80 mb-1">Payment Amount</label>
                    <NumberInput
                        id="paymentAmount"
                        value={amount === '' ? 0 : amount}
                        onChange={setAmount}
                        placeholder="Enter amount to pay"
                        autoFocus
                    />
                     {isInvalid && amount !== '' && (
                        <p className="text-sm text-red-500 mt-1">
                            Please enter a valid amount between 0 and {formatCurrency(remainingAmount)}.
                        </p>
                    )}
                </div>
                <div className="flex justify-end pt-4 space-x-2 border-t mt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleConfirm} disabled={isInvalid}>Confirm Payment</Button>
                </div>
            </div>
        </Modal>
    );
};

export default PaymentModal;