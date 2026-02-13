import { useState, useRef, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

export default function PinConfirmModal({ isOpen, onClose, onConfirm, loading = false, title = 'Enter PIN to Confirm' }) {
  const [values, setValues] = useState(Array(5).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setValues(Array(5).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValues.every((v) => v !== '')) {
      onConfirm(newValues.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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
          <div className="flex justify-center gap-3">
            {values.map((val, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border-2 border-gray-300 text-center text-2xl font-bold
                  focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
