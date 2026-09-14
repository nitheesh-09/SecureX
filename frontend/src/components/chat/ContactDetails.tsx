'use client';

import React from 'react';
import { Contact, ChatMessage } from '@/types/chat';
import { SecureShareStatus } from './SecureShareStatus';

interface ContactDetailsProps {
  contact: Contact;
  messages: ChatMessage[];
  onClose: () => void;
  className?: string;
}

export const ContactDetails: React.FC<ContactDetailsProps> = ({
  contact,
  messages,
  onClose,
  className = '',
}) => {
  // Extract all ZIP attachments shared in this conversation
  const sharedFiles = messages
    .filter((m) => !!m.attachment)
    .map((m) => ({
      attachment: m.attachment!,
      timestamp: m.timestamp,
      senderId: m.senderId,
    }));

  return (
    <aside
      className={`w-full sm:w-80 lg:w-96 flex flex-col bg-white border-l border-slate-200 select-none h-full overflow-y-auto ${className}`}
    >
      {/* Top Header */}
      <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Peer & Security Channel</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close details"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Contact Profile Overview */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center font-mono font-bold text-white text-2xl shadow-md border-2 border-red-200`}
          >
            {contact.initials}
          </div>
          <h4 className="mt-3 text-base sm:text-lg font-bold text-slate-900 leading-tight font-sans">
            {contact.name}
          </h4>
          <p className="text-xs font-mono text-red-600 font-semibold mt-0.5">
            {contact.role || 'Verified Peer'}
          </p>
          <p className="text-xs text-slate-600 mt-2 font-sans px-2">
            &ldquo;{contact.about}&rdquo;
          </p>
        </div>

        {/* Security & Verification Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Cryptographic Identity
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <svg className="w-3 h-3 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Verified E2EE
            </span>
          </div>

          <div>
            <div className="text-[11px] text-slate-600 font-mono mb-1 font-medium">
              Peer Key Fingerprint:
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-red-200 font-mono text-[11px] text-red-700 font-semibold break-all leading-relaxed shadow-2xs">
              {contact.keyFingerprint}
            </div>
          </div>

          <div className="text-[11px] text-slate-600 leading-snug">
            All files exchanged with this recipient undergo local metadata sanitization before end-to-end encrypted dispatch.
          </div>
        </div>

        {/* Contact Details */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
            Channel Details
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Identity:</span>
              <span className="font-mono text-slate-800 font-medium truncate max-w-[180px]">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Direct Route:</span>
                <span className="font-mono text-slate-800 font-medium">{contact.phone}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">State:</span>
              <span className="font-mono text-slate-800">
                {contact.online ? (
                  <span className="text-emerald-600 font-semibold">Active Session</span>
                ) : (
                  contact.lastSeen || 'Offline'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Shared Files History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Shared ZIP Archives ({sharedFiles.length})
            </h5>
          </div>

          {sharedFiles.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-mono">
              No ZIP archives transferred yet in this session
            </div>
          ) : (
            <div className="space-y-2">
              {sharedFiles.map((file, idx) => (
                <div
                  key={`${file.attachment.id}-${idx}`}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-red-300 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-semibold text-slate-900 truncate" title={file.attachment.name}>
                        {file.attachment.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {file.attachment.formattedSize} • {file.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">Pipeline</span>
                    <SecureShareStatus status={file.attachment.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
