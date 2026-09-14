'use client';

import React from 'react';
import { ChatMessage, ZipAttachment } from '@/types/chat';
import { ZipFilePreview } from './ZipFilePreview';

interface MessageBubbleProps {
  message: ChatMessage;
  onOpenInspector?: (attachment: ZipAttachment, isOutgoing: boolean) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onOpenInspector,
}) => {
  const isOutgoing = message.senderId === 'me';

  return (
    <div className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[68%] rounded-2xl p-3 sm:p-3.5 shadow-md ${
          isOutgoing
            ? 'bg-gradient-to-br from-red-600 via-red-600 to-rose-700 text-white rounded-br-xs border border-red-500 shadow-md shadow-red-600/20'
            : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-xs'
        }`}
      >
        {/* Attachment Card if present */}
        {message.attachment && (
          <div className="mb-2">
            <ZipFilePreview
              attachment={message.attachment}
              isOutgoing={isOutgoing}
              onOpenInspector={(att) => onOpenInspector?.(att, isOutgoing)}
            />
          </div>
        )}

        {/* Message Text if present */}
        {message.text && (
          <p className="text-sm sm:text-[14.5px] leading-relaxed break-words whitespace-pre-wrap font-sans">
            {message.text}
          </p>
        )}

        {/* Message Timestamp & Cryptographic indicator - STRICTLY ZERO TICKS */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10.5px] font-mono select-none ${
            isOutgoing ? 'text-red-100/90' : 'text-slate-400'
          }`}
        >
          <span>{message.timestamp}</span>
          <span className={`text-[10px] ${isOutgoing ? 'text-white/80' : 'text-slate-400'}`} title="End-to-End Encrypted">
            🔒
          </span>
        </div>
      </div>
    </div>
  );
};
