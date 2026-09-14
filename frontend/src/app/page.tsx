'use client';

import React, { useState, useEffect } from 'react';
import { AuthUser } from '@/types/chat';
import { AuthScreen } from '@/components/chat/AuthScreen';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { TopNav, ActiveAppView } from '@/components/TopNav';
import { MetadataScannerView } from '@/components/MetadataScannerView';
import { SecureXLogo } from '@/components/chat/SecureXLogo';

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('securex_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id && parsed?.email) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveAppView>('chat-prototype');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = getStoredUser();
    if (stored) {
      setCurrentUser(stored);
    }
  }, []);

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('securex_auth_user', JSON.stringify(user));
    } catch {
      // Ignore
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('securex_auth_user');
    } catch {
      // Ignore
    }
  };

  // SSR & initial client render matching shell to completely prevent hydration mismatches
  if (!isMounted) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 tech-grid">
        <TopNav activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <SecureXLogo size="md" showSubtitle={true} />
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mt-2" />
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Initializing SecureX Workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 tech-grid">
      {/* Top Workspace Mode Switcher */}
      <TopNav activeView={activeView} onViewChange={setActiveView} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeView === 'chat-prototype' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {!currentUser ? (
              /* Authentication View (Login / Register) */
              <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                <AuthScreen onAuthSuccess={handleAuthSuccess} />
              </div>
            ) : (
              /* SecureX Encrypted ZIP Transfer Workspace */
              <div className="flex-1 flex flex-col p-2 sm:p-4 min-h-0 overflow-hidden">
                <ChatWorkspace currentUser={currentUser} onLogout={handleLogout} />
              </div>
            )}
          </div>
        ) : (
          /* Existing Single-File Metadata Scanner Flow */
          <div className="flex-1 flex flex-col overflow-y-auto">
            <MetadataScannerView onSwitchToChat={() => setActiveView('chat-prototype')} />
          </div>
        )}
      </div>
    </div>
  );
}
