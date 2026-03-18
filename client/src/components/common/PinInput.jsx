import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function PinInput({ length = 5, onComplete, onChange, label = 'Enter PIN', error = '' }) {
  const [value, setValue] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, length);
    setValue(val);
    onChange?.(val);

    if (val.length === length) {
      onComplete?.(val);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={length}
          value={value}
          onChange={handleChange}
          placeholder={`Enter ${length}-digit PIN`}
          className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'}`}
        />
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          title={showPin ? 'Hide PIN' : 'Show PIN'}
        >
          {showPin ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
