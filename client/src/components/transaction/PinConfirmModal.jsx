import { useEffect, useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import PinInput from '../common/PinInput';

export default function PinConfirmModal({ isOpen, onClose, onConfirm, loading = false, title = 'Enter PIN to Confirm' }) {
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <p className="mb-5 text-sm text-gray-500">Enter your 5-digit security PIN</p>

        {loading ? (
          <LoadingSpinner size="lg" className="py-8" />
        ) : (
          <PinInput
            length={5}
            onComplete={(pin) => onConfirm(pin)}
            error={error}
            label="" // No label since we're using the modal title
          />
        )}
      </div>
    </div>
  );
}
