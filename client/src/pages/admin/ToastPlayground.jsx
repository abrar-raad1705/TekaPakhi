import React from "react";
import { toast } from "sonner";

export default function ToastPlayground() {
  const testSuccess = () => {
    toast.success("Transaction Successful!", {
      description: "Your money has been sent to the recipient successfully.",
    });
  };

  const testError = () => {
    toast.error("Transaction Failed", {
      description: "Insufficient balance or invalid PIN. Please try again.",
    });
  };

  const testWarning = () => {
    // Sonner doesn't have a specific 'warning' method that uses yellow icons by default with richColors, 
    // it usually uses toast() with an icon or colors. 
    // But since I enabled richColors, toast.warning might work if it exists, or toast.info.
    // Let's test standard ones.
    toast.warning("Secure Your Account", {
      description: "Your PIN is too simple. Please change it for better security.",
    });
  };

  const testInfo = () => {
    toast.info("System Maintenance", {
      description: "The system will be down for 5 minutes at midnight.",
    });
  };

  const testAction = () => {
    const pin = "55443";
    toast.success(`Temporary PIN: ${pin}`, {
      duration: Infinity,

      description: "Profile created! Share this PIN now. It will not be shown again.",
      action: {
        label: "Copy PIN",
        onClick: () => {
          navigator.clipboard.writeText(pin);
          toast.success("PIN copied to clipboard", { duration: 1000 });
        },
      },
    });
  };

  const testMultiple = () => {
    testSuccess();
    setTimeout(testInfo, 200);
    setTimeout(testWarning, 400);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 p-8">
      <div className="mx-auto w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-100 p-10 mt-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Toast Playground</h1>
        <p className="text-gray-500 font-medium mb-10">
          Test all your sonner toast variations here without manual operations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={testSuccess}
            className="flex flex-col items-start p-6 rounded-2xl border-2 border-green-50 bg-green-50/30 hover:bg-green-50 transition-all text-left"
          >
            <span className="text-sm font-bold text-green-700 mb-1">Success Toast</span>
            <span className="text-xs text-green-600/70 font-medium tracking-tight">Green tick + White box</span>
          </button>

          <button
            onClick={testError}
            className="flex flex-col items-start p-6 rounded-2xl border-2 border-red-50 bg-red-50/30 hover:bg-red-50 transition-all text-left"
          >
            <span className="text-sm font-bold text-red-700 mb-1">Error Toast</span>
            <span className="text-xs text-red-600/70 font-medium tracking-tight">Red exclamation + White box</span>
          </button>

          <button
            onClick={testWarning}
            className="flex flex-col items-start p-6 rounded-2xl border-2 border-yellow-50 bg-yellow-50/30 hover:bg-yellow-50 transition-all text-left"
          >
            <span className="text-sm font-bold text-yellow-700 mb-1">Warning Toast</span>
            <span className="text-xs text-yellow-600/70 font-medium tracking-tight">Yellow warning + White box</span>
          </button>

          <button
            onClick={testInfo}
            className="flex flex-col items-start p-6 rounded-2xl border-2 border-blue-50 bg-blue-50/30 hover:bg-blue-50 transition-all text-left"
          >
            <span className="text-sm font-bold text-blue-700 mb-1">Info Toast</span>
            <span className="text-xs text-blue-600/70 font-medium tracking-tight">Blue info + White box</span>
          </button>

          <button
            onClick={testAction}
            className="flex flex-col items-start p-6 rounded-2xl border-2 border-primary-50 bg-primary-50/30 hover:bg-primary-50 transition-all text-left sm:col-span-2"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-primary-700 mb-1">Copy PIN Toast (Action)</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-600 text-[10px] text-white font-black uppercase tracking-tighter">Premium</span>
            </div>
            <span className="text-xs text-primary-600/70 font-medium tracking-tight">Sticky toast with a prominent copy button</span>
          </button>

          <button
            onClick={testMultiple}
            className="flex items-center justify-center py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-bold hover:border-gray-300 hover:text-gray-700 transition-all sm:col-span-2"
          >
            Trigger Stack
          </button>
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-gray-50 border border-gray-100 italic text-sm text-gray-400 text-center">
            You can modify `main.jsx` and the changes will reflect instantly when you press these buttons.
        </div>
      </div>
    </div>
  );
}
