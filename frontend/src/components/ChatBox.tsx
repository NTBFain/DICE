'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMessages, sendMessage } from '@/lib/api';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useTranslations } from 'next-intl';

interface ChatBoxProps {
  orderId: number;
  currentUserId: number;
}

export default function ChatBox({ orderId, currentUserId }: ChatBoxProps) {
  const t = useTranslations('ChatBox');
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['order-messages', orderId],
    queryFn: () => getMessages(orderId),
    enabled: !!orderId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => sendMessage(orderId, msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-messages', orderId] });
      setContent('');
      scrollToBottom();
    },
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Scroll to bottom on initial load and when messages change significantly
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      sendMessageMutation.mutate(content);
    }
  };

  const quickReplies = [
    t('quickReply1'),
    t('quickReply2'),
    t('quickReply3'),
    t('quickReply4')
  ];

  return (
    <div className="flex flex-col h-[500px] bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white dark:bg-neutral-950 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wider uppercase">{t('orderChat')}</h3>
        <p className="text-[10px] text-neutral-500 dark:text-neutral-500">{t('messagesUpdatedAuto')}</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-sm text-neutral-500 dark:text-neutral-500">
            {t('noMessagesYet')}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                    {isMe ? t('you') : msg.sender_name}
                  </span>
                  <span className="text-[9px] text-neutral-600">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-900/20'
                      : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 rounded-tl-sm border border-neutral-200 dark:border-neutral-700/50 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies for Admin */}
      {user?.is_admin && (
        <div className="bg-white dark:bg-neutral-950 px-3 pt-2 flex gap-2 overflow-x-auto scrollbar-none pb-2 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setContent(reply)}
              className="text-[10px] whitespace-nowrap bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-blue-400 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/50 rounded-full px-3 py-1.5 transition-all cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-950 p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 shrink-0">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('typeMessage')}
          className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-neutral-600"
          required
        />
        <button
          type="submit"
          disabled={sendMessageMutation.isPending || !content.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-200 dark:bg-neutral-800 disabled:text-neutral-500 dark:text-neutral-500 text-white px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[50px]"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
