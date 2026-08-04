'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister, User, LoginCredentials, RegisterCredentials, apiClient } from '@/lib/api';

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginUser: (data: LoginCredentials) => Promise<void>;
  registerUser: (data: RegisterCredentials) => Promise<void>;
  logoutUser: () => void;
  fetchUser: () => Promise<void>;
  apiClient: typeof apiClient;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('token');
    }
    return false;
  });

  const logoutUser = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      console.warn('Session expired or invalid token. Logging out.');
      logoutUser();
    } finally {
      setLoading(false);
    }
  }, [logoutUser]);

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUser();
    }
  }, [token, fetchUser]);

  const loginUser = async (data: LoginCredentials) => {
    setLoading(true);
    try {
      const res = await apiLogin(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', res.access_token);
      }
      setToken(res.access_token);
      
      // Immediately fetch user info
      const userData = await getMe();
      setUser(userData);
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (data: RegisterCredentials) => {
    setLoading(true);
    try {
      await apiRegister(data);
      // Auto login after register
      await loginUser({ email: data.email, password: data.password });
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, registerUser, logoutUser, fetchUser, apiClient }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
