import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/game';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface CommunityChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const CommunityChat: React.FC<CommunityChatProps> = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only scroll the internal chat container, never scroll the outer webpage/window
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sounds.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickEmote = (emote: string) => {
    sounds.playClick();
    onSendMessage(emote);
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 flex flex-col h-[380px] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-slate-200">Chat phòng bay</span>
        </div>
        <div className="flex items-center gap-1">
          {['🚀', '💥', '💰', '🔥', '💀'].map(emote => (
            <button
              key={emote}
              onClick={() => handleQuickEmote(emote)}
              className="text-sm p-1 hover:bg-slate-800 rounded transition-colors active:scale-110"
              title={`Gửi ${emote}`}
            >
              {emote}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-2 rounded-xl transition-all ${
              msg.isSystem
                ? 'bg-amber-950/20 border border-amber-500/20 text-amber-300'
                : 'bg-slate-950/50 border border-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <img
                  src={msg.avatar}
                  alt={msg.user}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="font-semibold text-slate-300">{msg.user}</span>
                {msg.badge === 'DISCORD' ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40 font-bold flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    DISCORD
                  </span>
                ) : msg.badge ? (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {msg.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] text-slate-500 font-mono-numbers">{msg.time}</span>
            </div>
            <p className="text-slate-200 break-words leading-relaxed pl-5">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Nhắn tin với anh em..."
          maxLength={100}
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all active:scale-95 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
