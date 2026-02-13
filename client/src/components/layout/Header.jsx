import { useNavigate } from 'react-router-dom';

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
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        {rightAction}
      </div>
    </header>
  );
}
