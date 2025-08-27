import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-foreground/80">{message}</p>
        <div className="flex justify-end pt-6 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;