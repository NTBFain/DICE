'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, fetchUser } = useAuth();
  const userId = user?.id;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isLocal ? `${window.location.hostname}:8000` : window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        void fetchUser();
        reconcileOrders();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('WebSocket message received:', payload);
          const { type, data } = payload;

          if (type === 'user_roles_updated' && data?.user_id === userId) {
            void fetchUser();
          } else if (type === 'chat_message') {
            // Update order messages list cached by React Query
            queryClient.setQueryData(['order-messages', data.order_id], (old: any) => {
              if (!old) return [data];
              if (old.some((m: any) => m.id === data.id)) return old;
              return [...old, data];
            });
          } else if (type === 'auction_updated') {
            // Update auctions list cached by React Query
            queryClient.setQueryData(['auctions'], (old: any) => {
              if (!old) return [];
              return old.map((auc: any) => (auc.id === data.id ? data : auc));
            });
            queryClient.setQueryData(['auction', data.id], data);
          } else if (type === 'auction_message_added') {
            queryClient.setQueryData(['auction-messages', payload.auction_id], (old: any) => {
              if (!old) return [data];
              if (old.some((m: any) => m.id === data.id)) return old;
              return [...old, data];
            });
            queryClient.invalidateQueries({ queryKey: ['auction-messages', payload.auction_id] });
          } else if (type === 'auction_ended') {
            reconcileOrders();
            const auctionId = data?.auction_id;
            if (auctionId) {
              queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
              queryClient.invalidateQueries({ queryKey: ['auction', String(auctionId)] });
            }
            queryClient.invalidateQueries({ queryKey: ['auctions'] });
          } else if (type === 'order_status_updated' || type === 'invoice_updated' || type === 'revision_updated') {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['client-orders'] });
            if (data?.order_id) {
              queryClient.invalidateQueries({ queryKey: ['order', data.order_id] });
              queryClient.invalidateQueries({ queryKey: ['invoices', data.order_id] });
              queryClient.invalidateQueries({ queryKey: ['order-invoices', data.order_id] });
              queryClient.invalidateQueries({ queryKey: ['revisions', data.order_id] });
              queryClient.invalidateQueries({ queryKey: ['order-revisions', data.order_id] });
            }
          } else if (type === 'notification') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (['ORDER', 'COMMISSION'].includes(data?.type) || /\/orders\/\d+/.test(data?.link || '')) reconcileOrders();
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed. Code:', event.code);
        setIsConnected(false);
        // Do NOT reconnect if authentication failed
        if (event.code === 4003 || event.code === 1008) {
          console.warn('WebSocket authentication rejected (Code 4003/1008). Reconnect aborted.');
          return;
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = () => {
        // Silently close for reconnect without throwing unhandled error log
        try {
          ws.close();
        } catch (e) {}
      };
    };

    const reconcileOrders = () => {
      // Only mounted queries refetch; no polling or extra browser sessions.
      for (const key of ['orders', 'client-orders', 'client-collection', 'client-commission-requests', 'artist-commission-info', 'publicQueue', 'order', 'order-invoices', 'invoices', 'order-revisions', 'revisions', 'order-files', 'files']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // Clear handler to avoid reconnect loop on cleanup
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, queryClient, fetchUser]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
