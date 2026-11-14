'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
  const queryClient = useQueryClient();
  const t = useTranslations('Login');
  const sessionVersion = useRef(0);
  const previousIdentity = useRef<User | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [retryingSession, setRetryingSession] = useState(false);
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
    sessionVersion.current += 1;
    previousIdentity.current = null;
    void queryClient.cancelQueries();
    queryClient.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    setLoading(false);
    setSessionError(false);
    setRetryingSession(false);
  }, [queryClient]);

  const fetchUser = useCallback(async () => {
    const version = sessionVersion.current;
    setRetryingSession(true);
    try {
      const userData = await getMe();
      if (version === sessionVersion.current) {
        const previous = previousIdentity.current;
        if (previous && (previous.id !== userData.id || previous.is_admin !== userData.is_admin || previous.is_artist !== userData.is_artist)) {
          // Remove privileged query results before rendering the new role.
          void queryClient.cancelQueries();
          queryClient.clear();
        }
        previousIdentity.current = userData;
        setUser(userData);
        setSessionError(false);
      }
    } catch (error) {
      if (version !== sessionVersion.current) return;
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401) logoutUser();
      else setSessionError(true);
    } finally {
      if (version === sessionVersion.current) {
        setLoading(false);
        setRetryingSession(false);
      }
    }
  }, [logoutUser, queryClient]);

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUser();
    }
  }, [token, fetchUser]);

  useEffect(() => {
    if (!token) return;
    const recheck = () => { void fetchUser(); };
    window.addEventListener('focus', recheck);
    return () => window.removeEventListener('focus', recheck);
  }, [token, fetchUser]);

  const loginUser = async (data: LoginCredentials) => {
    setLoading(true);
    try {
      const res = await apiLogin(data);
      sessionVersion.current += 1;
      previousIdentity.current = null;
      await queryClient.cancelQueries();
      queryClient.clear();
      setSessionError(false);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', res.access_token);
      }
      setToken(res.access_token);
      
      // The token effect restores identity once and owns its loading/recovery state.
    } catch (err) {
      logoutUser();
      throw err;
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
      {sessionError && token && <section role="alert" className="m-4 rounded-2xl border border-amber-500/40 bg-neutral-900 p-6 text-white">
        <h2 className="text-lg font-bold">{t('sessionUnavailable')}</h2>
        <p className="mt-2 text-sm">{t('sessionRetryDescription')}</p>
        <div className="mt-4 flex gap-3">
          <button disabled={retryingSession} onClick={() => { void fetchUser(); }} className="rounded-xl bg-blue-600 px-4 py-2 disabled:opacity-50">{t('retrySession')}</button>
          <button onClick={logoutUser} className="rounded-xl border px-4 py-2">{t('signOut')}</button>
        </div>
      </section>}
      {(!sessionError || !!user || !token) && children}
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
