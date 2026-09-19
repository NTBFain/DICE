'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Loader2, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

function LoginFormContent() {
  const { user, loginUser, registerUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const t = useTranslations('Login');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        router.push(redirectUrl);
      } else if (user.is_admin) {
        router.push('/dashboard/admin/users');
      } else if (user.is_artist) {
        router.push('/dashboard/artist/orders');
      } else {
        router.push('/dashboard/client');
      }
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerUser({ email, password, full_name: fullName });
      } else {
        await loginUser({ email, password });
      }
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'An error occurred. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-neutral-950">
      <div className="w-full max-w-md bg-neutral-900/50 border border-neutral-800/90 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              {isRegister ? t('createAccount') : t('welcomeBack')}
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {isRegister ? t('createSubtitle') : t('welcomeSubtitle')}
            </p>
          </div>

          {/* Quick Demo Login Credentials Buttons */}
          {!isRegister && (
            <div className="mb-6 p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                {t('quickCredentials')}
              </span>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@example.com');
                    setPassword('password123');
                  }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-left text-xs transition-colors cursor-pointer"
                >
                  <div className="font-bold text-purple-400 text-[11px]">👑 Admin</div>
                  <div className="text-[9px] text-neutral-400 truncate">admin@example.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('artist@example.com');
                    setPassword('password123');
                  }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-left text-xs transition-colors cursor-pointer"
                >
                  <div className="font-bold text-blue-400 text-[11px]">🎨 Artist</div>
                  <div className="text-[9px] text-neutral-400 truncate">artist@example.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('client@example.com');
                    setPassword('password123');
                  }}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-left text-xs transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-400 text-[11px]">👤 Client</div>
                  <div className="text-[9px] text-neutral-400 truncate">client@example.com</div>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  {t('fullName')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 pl-9 pr-4 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                {t('email')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 pl-9 pr-4 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-all text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 pl-9 pr-10 placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-all text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-blue-600 cursor-pointer text-sm shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('processing')}
                </>
              ) : isRegister ? (
                t('createAccount')
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-neutral-400">
            {isRegister ? t('alreadyAccount') : t('noAccount')}{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline decoration-blue-500/30 underline-offset-4"
            >
              {isRegister ? t('signIn') : t('signUp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-neutral-950 min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

