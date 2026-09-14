'use client';

import React, { useState, useEffect } from 'react';
import { Contact, ChatMessage, AuthUser, RegisteredUser } from '@/types/chat';
import { SecureXLogo } from './SecureXLogo';
import { searchRegisteredUsers, listRegisteredPeers } from '@/lib/chatApi';

interface ChatSidebarProps {
  currentUser: AuthUser;
  contacts: Contact[];
  selectedContactId?: string;
  onSelectContact: (contactId: string) => void;
  onStartConversationWithUser: (recipientId: string) => Promise<void>;
  messagesByContact: Record<string, ChatMessage[]>;
  onLogout: () => void;
  className?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentUser,
  contacts,
  selectedContactId,
  onSelectContact,
  onStartConversationWithUser,
  messagesByContact,
  onLogout,
  className = '',
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [peerSearchQuery, setPeerSearchQuery] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isSearchingPeers, setIsSearchingPeers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load available peers when starting a new transfer
  useEffect(() => {
    if (!isCreatingNew || !currentUser.token) return;

    let isMounted = true;
    setIsSearchingPeers(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        let results: RegisteredUser[] = [];
        if (peerSearchQuery.trim()) {
          results = await searchRegisteredUsers(peerSearchQuery, currentUser.token!);
        } else {
          results = await listRegisteredPeers(currentUser.token!);
        }
        if (isMounted) {
          setRegisteredUsers(results);
        }
      } catch (err) {
        if (isMounted) {
          setSearchError('Could not query registered users from database.');
        }
      } finally {
        if (isMounted) setIsSearchingPeers(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isCreatingNew, peerSearchQuery, currentUser.token]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const getLastMessageInfo = (contactId: string) => {
    const list = messagesByContact[contactId] || [];
    if (list.length === 0) return { preview: 'Session initialized', time: '' };
    const last = list[list.length - 1];
    let preview = last.text || '';
    if (last.attachment) {
      preview = `📁 ${last.attachment.name}`;
    }
    return { preview, time: last.timestamp };
  };

  const handleSelectPeerToChat = async (peer: RegisteredUser) => {
    try {
      await onStartConversationWithUser(peer.id);
      setIsCreatingNew(false);
      setPeerSearchQuery('');
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Failed to start conversation.');
    }
  };

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 flex flex-col bg-white border-r border-slate-200 select-none ${className}`}
    >
      {/* Top Header: SecureX Logo + Current User Profile & Logout */}
      <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <SecureXLogo size="sm" showSubtitle={true} />

        {/* Current User & Logout */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200"
            title={`Logged in as ${currentUser.name} (${currentUser.email})`}
          >
            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-mono text-slate-700 font-medium hidden sm:inline max-w-[85px] truncate">
              {currentUser.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action Bar: New Transfer CTA + Filter */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsCreatingNew((prev) => !prev);
              setPeerSearchQuery('');
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>+ New Transfer / Peer</span>
          </button>
        </div>

        {/* Real User Search Modal / Dropdown */}
        {isCreatingNew && (
          <div className="p-3 rounded-xl bg-white border border-red-200 shadow-lg space-y-2.5 animate-in fade-in duration-150">
            <div className="text-[11px] font-mono text-red-700 font-semibold flex items-center justify-between">
              <span>Find Registered Peer</span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={peerSearchQuery}
              onChange={(e) => setPeerSearchQuery(e.target.value)}
              placeholder="Search by name or email in database..."
              autoFocus
              className="w-full px-3 py-1.5 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs font-mono rounded-lg border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600/20 focus:outline-none"
            />

            {searchError && (
              <p className="text-[11px] font-mono text-red-600">{searchError}</p>
            )}

            {/* Results list */}
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {isSearchingPeers ? (
                <div className="p-3 text-center text-xs font-mono text-slate-400">
                  Querying database...
                </div>
              ) : registeredUsers.length === 0 ? (
                <div className="p-3 text-center text-xs font-mono text-slate-400">
                  {peerSearchQuery ? 'No registered peers found.' : 'No other registered users yet.'}
                </div>
              ) : (
                registeredUsers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => handleSelectPeerToChat(peer)}
                    className="w-full p-2 text-left hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {peer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-red-700">
                        {peer.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {peer.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-red-600 font-semibold group-hover:underline">
                      Chat →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Filter Conversation Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter active chats..."
            className="w-full pl-8 pr-7 py-1.5 bg-white text-xs text-slate-900 placeholder-slate-400 rounded-lg border border-slate-200 focus:border-red-500 focus:outline-none font-mono"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Active Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono space-y-3">
            {filterQuery ? (
              <p>No conversations match &ldquo;{filterQuery}&rdquo;</p>
            ) : (
              <div className="py-8 space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="text-slate-800 font-semibold">No Active Conversations</div>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-normal">
                  Click &ldquo;+ New Transfer / Peer&rdquo; above to find a registered user and start an encrypted transfer.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isSelected = contact.id === selectedContactId;
            const { preview, time } = getLastMessageInfo(contact.id);

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContact(contact.id)}
                className={`w-full p-3 sm:px-4 flex items-center gap-3 transition-colors text-left cursor-pointer focus:outline-none ${
                  isSelected
                    ? 'bg-red-50/90 border-l-4 border-red-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center font-mono font-bold text-white text-xs shadow-sm`}
                  >
                    {contact.initials}
                  </div>
                  {contact.online && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                      title="Online & Encrypted"
                    />
                  )}
                </div>

                {/* Contact details & snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-semibold text-xs sm:text-sm truncate font-sans ${
                        isSelected ? 'text-red-950 font-bold' : 'text-slate-900'
                      }`}
                    >
                      {contact.name}
                    </span>
                    {time && (
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                        {time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-500 truncate max-w-[190px] font-mono">
                      {preview}
                    </p>

                    {/* Unread Badge */}
                    {contact.unreadCount > 0 && !isSelected && (
                      <span className="flex-shrink-0 px-1.5 py-0.2 min-w-[16px] text-[10px] font-mono font-bold text-white bg-red-600 rounded-full text-center shadow-xs">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[10px] font-mono text-slate-500 font-medium tracking-wider uppercase">
          E2EE Tunnel • Database Sync Active
        </span>
      </div>
    </aside>
  );
};
