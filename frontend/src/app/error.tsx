'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 tech-grid p-6 text-center text-slate-900">
      <div className="max-w-md p-6 bg-white border border-red-200 rounded-2xl shadow-xl space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold font-mono text-slate-900">Something went wrong!</h2>
        <p className="text-sm text-slate-600 font-sans">{error.message || 'An unexpected error occurred.'}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2.5 font-mono text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
