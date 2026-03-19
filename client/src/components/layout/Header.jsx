import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function Header({ title, showBack = false, rightAction = null }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-700" strokeWidth={2} />
            </button>
          )}
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        </div>
        {rightAction}
      </div>
    </header>
  );
}
