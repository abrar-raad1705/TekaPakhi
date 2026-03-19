import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-[#CD1C1C] animate-in fade-in slide-in-from-top-1 duration-200">
      <XMarkIcon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export function GlobalError({ message, onClose, actionLink, actionText }) {
  if (!message) return null;
  return (
    <div className="mb-6 rounded-2xl bg-[#FDE8E8] p-5 ring-1 ring-[#FBD5D5] transition-all animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CD1C1C]">
          <XMarkIcon className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 pt-1.5">
          <div className="flex items-start justify-between">
            <p className="text-[15px] font-medium leading-relaxed text-[#1F2937]">
              {message}
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 -mt-1 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                type="button"
              >
                <XMarkIcon className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
          </div>
          {actionLink && actionText && (
            <a
              href={actionLink}
              className="mt-2 inline-block text-[15px] font-bold text-[#1F2937] underline decoration-gray-400 underline-offset-4 hover:decoration-gray-900 transition-all font-sans tracking-tight"
            >
              {actionText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
