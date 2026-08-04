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
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) {
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isLocal ? `${window.location.hostname}:8000` : window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('WebSocket message received:', payload);
          const { type, data } = payload;

          if (type === 'chat_message') {
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
            // Invalidate auctions list to trigger status changes
            queryClient.invalidateQueries({ queryKey: ['auctions'] });
          } else if (type === 'notification') {
            // Invalidate notifications query to load new notification
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed.');
        setIsConnected(false);
        // Attempt reconnect after 5 seconds if unmounted
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
  }, [user, queryClient]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
