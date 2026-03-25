import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel",
  isDanger = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <div className="absolute right-4 top-4">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
            <ExclamationTriangleIcon className="h-8 w-8" />
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
          <p className="mb-8 text-sm text-gray-500 leading-relaxed whitespace-pre-line">
            {message}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                isDanger 
                  ? 'bg-red-600 shadow-red-200 hover:bg-red-700' 
                  : 'bg-primary-600 shadow-primary-200 hover:bg-primary-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
