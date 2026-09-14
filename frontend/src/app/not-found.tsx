import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 tech-grid p-6 text-center text-slate-900">
      <div className="max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-mono font-bold text-lg">
          404
        </div>
        <h2 className="text-xl font-bold font-mono text-slate-900">Page Not Found</h2>
        <p className="text-xs text-slate-600 font-sans">The requested resource could not be found.</p>
        <Link
          href="/"
          className="inline-block w-full rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2.5 font-mono text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
        >
          Return to SecureX
        </Link>
      </div>
    </div>
  );
}
