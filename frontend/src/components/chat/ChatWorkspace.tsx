'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AuthUser,
  Contact,
  ChatMessage,
  ZipAttachment,
  ConversationItem,
} from '@/types/chat';
import {
  fetchUserConversations,
  fetchConversationMessages,
  sendConversationMessage,
  createOrGetConversation,
  conversationToContact,
  updateConversationMessageAttachment,
} from '@/lib/chatApi';
import { createZipAttachment, sanitizeZipAttachment } from '@/lib/zipPrivacyScanner';
import { ChatSidebar } from './ChatSidebar';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { ContactDetails } from './ContactDetails';
import { ZipPrivacyModal } from './ZipPrivacyModal';

interface ChatWorkspaceProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  currentUser,
  onLogout,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [messagesByContact, setMessagesByContact] = useState<Record<string, ChatMessage[]>>({});
  const [stagedZip, setStagedZip] = useState<ZipAttachment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inspector Modal State
  const [inspectingAttachment, setInspectingAttachment] = useState<{
    attachment: ZipAttachment;
    isOutgoing: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages container to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load user conversations from SQLite database
  const loadConversations = useCallback(async (silent = false) => {
    if (!currentUser.token) return;
    try {
      if (!silent) setIsLoadingChats(true);
      const convList = await fetchUserConversations(currentUser.token);
      setConversations(convList);

      const contactList = convList.map(conversationToContact);
      setContacts(contactList);

      // Populate last messages into map if available
      setMessagesByContact((prev) => {
        const next = { ...prev };
        for (const conv of convList) {
          if (conv.peer && conv.last_message && !next[conv.peer.id]) {
            let att: ZipAttachment | undefined = undefined;
            if (conv.last_message.attachment_json) {
              try {
                att = JSON.parse(conv.last_message.attachment_json);
              } catch {
                // ignore
              }
            }
            next[conv.peer.id] = [
              {
                id: conv.last_message.id,
                conversationId: conv.id,
                senderId: conv.last_message.sender_id,
                recipientId: conv.last_message.receiver_id,
                text: conv.last_message.text,
                attachment: att,
                timestamp: 'Recent',
                status: 'delivered',
              },
            ];
          }
        }
        return next;
      });

      // Select first conversation if none selected
      if (!selectedContactId && contactList.length > 0) {
        setSelectedContactId(contactList[0].id);
      }
    } catch (err: unknown) {
      if (!silent) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load conversations.');
      }
    } finally {
      if (!silent) setIsLoadingChats(false);
    }
  }, [currentUser.token, selectedContactId]);

  // Initial load when user mounts
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const activeConversation = conversations.find(
    (c) => c.id === selectedContact?.conversationId || (c.peer && c.peer.id === selectedContactId)
  );

  // Load messages for currently active conversation
  const loadActiveMessages = useCallback(async (convId: string, peerId: string) => {
    if (!currentUser.token || !convId) return;
    try {
      const msgs = await fetchConversationMessages(convId, currentUser.token);
      setMessagesByContact((prev) => ({
        ...prev,
        [peerId]: msgs,
      }));
    } catch {
      // Ignore background poll errors
    }
  }, [currentUser.token]);

  // Whenever selected contact changes, load its messages from database
  useEffect(() => {
    if (activeConversation && selectedContact) {
      loadActiveMessages(activeConversation.id, selectedContact.id);
    }
  }, [activeConversation, selectedContact, loadActiveMessages]);

  // Periodic polling: refresh conversations and active messages every 3s
  useEffect(() => {
    if (!currentUser.token) return;

    const interval = setInterval(() => {
      loadConversations(true);
      if (activeConversation && selectedContact) {
        loadActiveMessages(activeConversation.id, selectedContact.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser.token, activeConversation, selectedContact, loadConversations, loadActiveMessages]);

  const currentMessages = selectedContact ? messagesByContact[selectedContact.id] || [] : [];

  useEffect(() => {
    if (selectedContact) {
      scrollToBottom();
    }
  }, [selectedContactId, currentMessages.length, selectedContact]);

  // Handle selecting a contact
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setMobileView('chat');
  };

  // Handle starting a new conversation with a real registered user from database
  const handleStartConversationWithUser = async (recipientId: string) => {
    if (!currentUser.token) return;
    const conv = await createOrGetConversation(recipientId, currentUser.token);
    await loadConversations(false);
    if (conv.peer) {
      setSelectedContactId(conv.peer.id);
    }
    setMobileView('chat');
  };

  // Handle sending message (text or ZIP attachment) to database
  const handleSendMessage = async (text?: string, attachment?: ZipAttachment) => {
    if (!selectedContact || !activeConversation || !currentUser.token) return;

    try {
      const persistedMsg = await sendConversationMessage(
        activeConversation.id,
        text,
        attachment,
        currentUser.token
      );

      // Clear staged ZIP once sent
      setStagedZip(null);

      // Append locally right away
      setMessagesByContact((prev) => {
        const existing = prev[selectedContact.id] || [];
        return {
          ...prev,
          [selectedContact.id]: [...existing, persistedMsg],
        };
      });

      // Refresh conversation list to update last_message preview
      loadConversations(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  // Open inspector modal for a specific attachment
  const handleOpenInspector = (attachment: ZipAttachment, isOutgoing: boolean) => {
    setInspectingAttachment({
      attachment,
      isOutgoing,
    });
  };

  // Handle sanitization from within the inspector modal
  const handleSanitizeFromModal = async (findingIdsToRemove: Set<string>) => {
    if (!inspectingAttachment) return;

    const sanitized = await sanitizeZipAttachment(
      inspectingAttachment.attachment,
      findingIdsToRemove
    );

    // Case 1: If inspecting currently staged ZIP (pre-send)
    if (
      stagedZip &&
      (stagedZip.id === inspectingAttachment.attachment.id ||
        inspectingAttachment.attachment.id === stagedZip.id)
    ) {
      setStagedZip(sanitized);
    }

    // Case 2: If inspecting an already sent message
    if (selectedContact) {
      let targetMessageId: string | null = null;
      setMessagesByContact((prev) => {
        const list = prev[selectedContact.id] || [];
        const updated = list.map((m) => {
          if (m.attachment?.id === inspectingAttachment.attachment.id) {
            targetMessageId = m.id;
            return {
              ...m,
              attachment: sanitized,
            };
          }
          return m;
        });
        return {
          ...prev,
          [selectedContact.id]: updated,
        };
      });

      // Persist to backend SQLite immediately so periodic 3s polling retains sanitized score 100
      if (targetMessageId && activeConversation && currentUser.token) {
        try {
          await updateConversationMessageAttachment(
            activeConversation.id,
            targetMessageId,
            sanitized,
            currentUser.token
          );
        } catch (err) {
          console.error('Failed to update message attachment on server:', err);
        }
      }
    }

    // Update active inspecting attachment in modal
    setInspectingAttachment({
      ...inspectingAttachment,
      attachment: sanitized,
    });
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden bg-white sm:rounded-2xl sm:border border-slate-200 shadow-2xl">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Chat Sidebar */}
        <div
          className={`${
            mobileView === 'sidebar' ? 'flex' : 'hidden'
          } md:flex flex-shrink-0 h-full`}
        >
          <ChatSidebar
            currentUser={currentUser}
            contacts={contacts}
            selectedContactId={selectedContact?.id}
            onSelectContact={handleSelectContact}
            onStartConversationWithUser={handleStartConversationWithUser}
            messagesByContact={messagesByContact}
            onLogout={onLogout}
          />
        </div>

        {/* Center: Main Chat / Empty State Area */}
        <div
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col h-full min-w-0 bg-slate-50 relative`}
        >
          {/* Subtle red/slate grid background */}
          <div className="absolute inset-0 pointer-events-none opacity-40 tech-grid" aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none portal-glow" aria-hidden="true" />

          {selectedContact ? (
            <>
              {/* Chat Header */}
              <ChatHeader
                contact={selectedContact}
                onBackToSidebar={() => setMobileView('sidebar')}
                onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
                isDetailsOpen={isDetailsOpen}
              />

              {/* Error banner if message failed */}
              {errorMessage && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-mono flex items-center justify-between z-10">
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2 z-10 relative">
                {/* Secure Session Handshake Header */}
                <div className="my-3 flex flex-col items-center justify-center gap-2">
                  <div className="max-w-md px-4 py-2 rounded-xl bg-white/95 border border-red-200 text-center shadow-xs backdrop-blur-xs space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-red-600 font-mono text-xs font-bold">
                      <svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Secure E2EE Channel Established</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-600 leading-tight">
                      Zero-Knowledge Metadata Inspection enabled with {selectedContact.name} ({selectedContact.email})
                    </p>
                    <p className="text-[10px] font-mono text-red-600/80 font-medium">
                      Fingerprint: {selectedContact.keyFingerprint}
                    </p>
                  </div>
                </div>

                {/* Empty conversation placeholder if no messages yet */}
                {currentMessages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-mono font-semibold text-slate-800">
                      Start the conversation with {selectedContact.name}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm font-sans">
                      Type a message below or attach a ZIP archive to test deterministic metadata privacy inspection, risk scoring, and zero-leak transfer.
                    </p>
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    // Check whether message was sent by me
                    const isMyMessage = msg.senderId === currentUser.id || msg.senderId === 'me';
                    const normalizedMsg = {
                      ...msg,
                      senderId: isMyMessage ? 'me' : msg.senderId,
                    };

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={normalizedMsg}
                        onOpenInspector={(att, isOut) => handleOpenInspector(att, isOut)}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer (Attachment + Text + Send) */}
              <div className="z-10 relative">
                <MessageComposer
                  onSendMessage={handleSendMessage}
                  onOpenInspector={(att) => handleOpenInspector(att, true)}
                  stagedZip={stagedZip}
                  onStagedZipChange={setStagedZip}
                />
              </div>
            </>
          ) : (
            /* Empty State Hero: No Conversation Selected */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
              <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
                {/* Shield + Lock Icon */}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-md shadow-red-500/10">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="5" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight">
                    Secure ZIP Transfer Workspace
                  </h2>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    {contacts.length === 0
                      ? "You haven't started a conversation yet. Find another registered user from the database to begin."
                      : "Select a conversation from the sidebar to view messages or transfer encrypted archives."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] font-mono text-slate-400">
                  <span>SQLite Database Persistence</span>
                  <span>•</span>
                  <span>Strict Authorization</span>
                  <span>•</span>
                  <span>E2EE Zero-Leak</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Optional Contact & Security Details Panel */}
        {isDetailsOpen && selectedContact && (
          <div className="absolute inset-y-0 right-0 z-20 md:relative md:z-auto flex h-full">
            <ContactDetails
              contact={selectedContact}
              messages={currentMessages}
              onClose={() => setIsDetailsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Full Prototype 1 Privacy Risk & Security Score Inspector Modal */}
      {inspectingAttachment && (
        <ZipPrivacyModal
          attachment={inspectingAttachment.attachment}
          isOutgoing={inspectingAttachment.isOutgoing}
          onClose={() => setInspectingAttachment(null)}
          onSanitize={handleSanitizeFromModal}
        />
      )}
    </div>
  );
};
