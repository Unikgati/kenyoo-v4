import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, title, message }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
        aria-modal="true" 
        role="dialog"
    >
      <div className="bg-card rounded-lg shadow-xl p-8 max-w-sm w-full text-center transform transition-all duration-300 scale-100">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
           <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
             <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
           </svg>
        </div>
        <h3 className="text-lg leading-6 font-medium text-card-foreground">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-foreground/70">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
