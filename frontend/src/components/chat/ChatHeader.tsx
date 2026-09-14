'use client';

import React from 'react';
import { Contact } from '@/types/chat';
import { E2EEncryptionBadge } from './SecureShareStatus';

interface ChatHeaderProps {
  contact: Contact;
  onBackToSidebar?: () => void;
  onToggleDetails?: () => void;
  isDetailsOpen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contact,
  onBackToSidebar,
  onToggleDetails,
  isDetailsOpen = false,
}) => {
  return (
    <header className="h-16 px-3 sm:px-4 bg-white border-b border-slate-200 flex items-center justify-between select-none z-10 shadow-xs">
      {/* Left: Mobile back button + Contact Avatar + Info */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Back to List Button */}
        {onBackToSidebar && (
          <button
            type="button"
            onClick={onBackToSidebar}
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back to contacts"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Contact Avatar */}
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center font-mono font-bold text-white text-xs shadow-sm`}
          >
            {contact.initials}
          </div>
          {contact.online && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
              title="Online & Cryptographically Verified"
            />
          )}
        </div>

        {/* Contact Name & Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate leading-tight font-sans">
              {contact.name}
            </h2>
            {contact.encryptionVerified && (
              <span title="Cryptographic Identity Verified" className="flex-shrink-0 inline-flex items-center">
                <svg
                  className="w-3.5 h-3.5 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
            {contact.online ? (
              <span className="text-emerald-600 font-medium">active tunnel</span>
            ) : (
              <span>last active {contact.lastSeen || 'recently'}</span>
            )}
            <span className="mx-1 text-slate-400">•</span>
            <span className="text-slate-500">{contact.role || 'Peer'}</span>
          </p>
        </div>
      </div>

      {/* Right: E2EE Badge + Details Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* End-to-End Encryption Badge */}
        <E2EEncryptionBadge />

        {/* Details Panel Toggle Button */}
        {onToggleDetails && (
          <button
            type="button"
            onClick={onToggleDetails}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDetailsOpen
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Toggle Contact & Security Details"
            aria-label="Toggle contact details"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};
