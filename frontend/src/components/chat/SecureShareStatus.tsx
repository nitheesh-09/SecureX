'use client';

import React from 'react';
import { AttachmentSecurityStatus } from '@/types/chat';

interface SecureShareStatusProps {
  status: AttachmentSecurityStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const SecureShareStatus: React.FC<SecureShareStatusProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getStatusConfig = (s: AttachmentSecurityStatus) => {
    switch (s) {
      case 'Ready for privacy scan':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          ),
          label: 'Ready for privacy scan',
        };
      case 'Sanitization required':
        return {
          bg: 'bg-red-50 border-red-200 text-red-700',
          dot: 'bg-red-500',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          ),
          label: 'Sanitization required',
        };
      case 'Ready to encrypt':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ),
          label: 'Ready to encrypt',
        };
      case 'Securely shared':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 12 2 2 4-4" />
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ),
          label: 'Securely shared',
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-medium shadow-xs transition-all ${config.bg} ${sizeClasses} ${className}`}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <span className="tracking-tight">{config.label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
    </span>
  );
};

export const E2EEncryptionBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-mono font-semibold tracking-tight shadow-xs ${className}`}
      title="End-to-End Encryption Active (SecureX Protocol)"
    >
      <svg
        className="w-3.5 h-3.5 text-red-600 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className="hidden sm:inline">End-to-End Encrypted</span>
      <span className="sm:hidden">E2EE Ready</span>
      <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-xs" />
    </div>
  );
};
