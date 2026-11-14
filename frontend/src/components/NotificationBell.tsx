'use client';

import { parseApiDate } from '@/lib/apiDate';
import { getNotificationText } from '@/lib/notificationText';

import { useState, useRef, useEffect, useId } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  type: string;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const t = useTranslations('Notifications');
  const notificationCopy = useTranslations('NotificationCopy');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];
      return await getNotifications(20);
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await markNotificationAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await markAllNotificationsAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800 btn-press cursor-pointer"
        aria-label={t('title')}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-400 animate-wiggle-repeat' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-neutral-900 shadow-xs">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div id={panelId} role="region" aria-label={t('title')} className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in-scale">
          <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-800/50">
            <h3 className="font-semibold text-white">{t('title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-3 h-3" /> {t('markAllRead')}
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                {t('empty')}
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notif => {
                  const text = getNotificationText(notif, notificationCopy);
                  return (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-neutral-800/50 transition-colors ${notif.is_read ? 'bg-neutral-900 opacity-70' : 'bg-neutral-800/30'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className={`text-sm ${notif.is_read ? 'text-neutral-300' : 'text-white font-medium'}`}>
                          {text.title}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                          {text.message}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-2">
                          {parseApiDate(notif.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      {notif.link && (
                        <Link
                          href={notif.link}
                          onClick={() => {
                            if (!notif.is_read) markAsReadMutation.mutate(notif.id);
                            setIsOpen(false);
                          }}
                          className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> {t('view')}
                        </Link>
                      )}
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notif.id)}
                          className="p-1 text-neutral-400 hover:text-white transition-colors"
                          title={t('markRead')}
                          aria-label={t('markRead')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
