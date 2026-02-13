import { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    error: 'bg-red-50 border-red-400 text-red-800',
    success: 'bg-green-50 border-green-400 text-green-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-md animate-[slideDown_0.3s_ease] rounded-lg border-l-4 px-4 py-3 shadow-lg ${styles[type]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-3 text-lg font-bold opacity-60 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}
