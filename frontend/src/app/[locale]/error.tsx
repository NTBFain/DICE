'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center bg-neutral-950 text-white">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-2xl font-bold">
        !
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">Something went wrong</h2>
      <p className="text-xs sm:text-sm text-neutral-400 mb-6 max-w-md">
        An unexpected application error occurred while loading this page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
