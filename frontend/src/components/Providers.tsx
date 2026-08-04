'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from './AuthContext';
import { WebSocketProvider } from './WebSocketContext';
import { ThemeProvider } from './ThemeContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // Cache API data for 30s to eliminate redundant network fetches
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
