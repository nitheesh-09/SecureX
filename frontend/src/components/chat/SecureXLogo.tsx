'use client';

import React from 'react';

interface SecureXLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const SecureXLogo: React.FC<SecureXLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSizeClass =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const titleSizeClass =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  const subtitleSizeClass =
    size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Red Shield + File + Lock emblem */}
      <div
        className={`relative ${iconSizeClass} flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-red-600 via-red-500 to-rose-600 border border-red-600 shadow-md shadow-red-600/20`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="w-4/5 h-4/5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield Outline */}
          <path
            d="M16 3L6 7.5V15C6 21.6 10.3 27.7 16 29C21.7 27.7 26 21.6 26 15V7.5L16 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Document / File Silhouette inside Shield */}
          <path
            d="M11 11H18L21 14V21C21 21.55 20.55 22 20 22H11C10.45 22 10 21.55 10 21V12C10 11.45 10.45 11 11 11Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          {/* Shackle / Padlock Arch */}
          <path
            d="M14 17V15.5C14 14.67 14.9 14 16 14C17.1 14 18 14.67 18 15.5V17"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Padlock Body */}
          <rect
            x="13"
            y="17"
            width="6"
            height="4"
            rx="1"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Brand Title & Subtitle */}
      <div className="flex flex-col leading-tight">
        <div className={`font-mono font-extrabold tracking-tight text-slate-900 ${titleSizeClass} flex items-center`}>
          <span>SECURE</span>
          <span className="text-red-600 ml-0.5">X</span>
        </div>
        {showSubtitle && (
          <span
            className={`font-mono tracking-wider text-red-600 font-semibold uppercase ${subtitleSizeClass}`}
          >
            Encrypted Transfer
          </span>
        )}
      </div>
    </div>
  );
};
