'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MetadataScannerView } from '@/components/MetadataScannerView';

export default function ScannerPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 tech-grid">
      <MetadataScannerView onSwitchToChat={() => router.push('/')} />
    </div>
  );
}
