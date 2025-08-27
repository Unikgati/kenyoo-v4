import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose} aria-modal="true" role="dialog">
      <div className="relative w-full max-w-lg p-6 bg-card rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between pb-4 border-b rounded-t border-border">
          <h3 className="text-xl font-semibold text-card-foreground">
            {title}
          </h3>
          <button type="button" className="inline-flex items-center p-1 ml-auto text-sm bg-transparent rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground" onClick={onClose} aria-label="Close modal">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
