'use client';

import React from 'react';

export const ProtectionProgress: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-white p-8 sm:p-10 text-center shadow-sm">
      {/* Center Spinner */}
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 mb-4">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>

      <h2 className="font-mono text-base font-bold tracking-widest text-slate-900 uppercase">
        PROTECTING
      </h2>

      <p className="mt-1.5 text-xs text-slate-500 font-normal">
        Removing selected metadata...
      </p>
    </div>
  );
};
