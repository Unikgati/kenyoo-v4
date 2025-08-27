import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import LoadingSpinner from './ui/LoadingSpinner';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<string | void>;
}

const FactoryResetModal: React.FC<FactoryResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed
            setTimeout(() => {
                setPassword('');
                setError(null);
                setIsLoading(false);
            }, 200); // Delay to allow closing animation
        }
    }, [isOpen]);

    const handleConfirmClick = async () => {
        setIsLoading(true);
        setError(null);
        const result = await onConfirm(password);
        if (typeof result === 'string') {
            setError(result);
        } else {
            // On success, the parent component will handle closing and logging out
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Factory Reset">
            <div>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="font-bold text-red-600 dark:text-red-400">Warning</h4>
                    <p className="text-sm text-foreground/80 mt-1">
                        You are about to perform an irreversible action. All sales data, drivers, products, and custom settings will be permanently deleted and reset to their initial state.
                    </p>
                </div>

                <div className="mt-6">
                    <label htmlFor="password-confirm" className="block text-sm font-medium text-foreground/80 mb-1">
                        Please enter your password to confirm.
                    </label>
                    <Input
                        id="password-confirm"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>
                
                <div className="flex justify-end pt-6 mt-4 space-x-2 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirmClick}
                        disabled={!password || isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <LoadingSpinner size="sm" />
                                <span>Resetting...</span>
                            </div>
                        ) : (
                            'Confirm Reset'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default FactoryResetModal;