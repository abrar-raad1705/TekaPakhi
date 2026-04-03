import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, ShieldExclamationIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

/**
 * A ultra-premium, professional confirmation modal with refined typography
 * and dynamic logic for color (Danger vs Success vs Warning).
 */
export default function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel",
  isDanger = false,
  isWarning = false // Specifically for Suspensions/Yellow accents
}) {
  if (!isOpen) return null;

  // Determine the primary color scheme
  let iconBg = "bg-blue-50/50 text-blue-600";
  let buttonBg = "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700";
  let Icon = CheckBadgeIcon;

  if (isDanger) {
    iconBg = "bg-red-50/50 text-red-600";
    buttonBg = "bg-red-600 text-white shadow-red-600/20 hover:bg-red-700";
    Icon = ShieldExclamationIcon;
  } else if (isWarning) {
    iconBg = "bg-amber-50/50 text-amber-600";
    buttonBg = "bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700";
    Icon = ExclamationTriangleIcon;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 antialiased">
      {/* Backdrop with extreme blur and subtle fade */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[6px] transition-all duration-300 animate-in fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Premium White Card */}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] ring-1 ring-slate-200 transition-all animate-in zoom-in-95 duration-200">
        
        {/* Subtle Close Button */}
        <button 
          onClick={onCancel} 
          className="absolute right-6 top-6 rounded-full p-2 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <XMarkIcon className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Animated Icon Container */}
          <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${iconBg} transition-all`}>
            <Icon className="h-10 w-10" strokeWidth={1.5} />
          </div>
          
          {/* Refined Heading */}
          <h3 className="mb-3 text-[22px] font-black tracking-tight text-slate-900 leading-tight">
            {title}
          </h3>
          
          {/* Professional Body Typography */}
          <p className="mb-10 text-[15px] font-medium leading-[1.6] text-slate-500 whitespace-pre-line px-2">
            {message}
          </p>

          {/* Premium Button Group */}
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-slate-100 bg-white py-4 text-[15px] font-bold text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-200 active:scale-[0.97]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 rounded-2xl py-4 text-[15px] font-black shadow-2xl transition-all active:scale-[0.97] ${buttonBg}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
