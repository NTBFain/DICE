'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user?.is_admin) {
      router.replace('/dashboard/admin');
    } else if (user?.is_artist) {
      router.replace('/dashboard/artist');
    } else if (user) {
      router.replace('/dashboard/client');
    } else {
      router.replace('/login?redirect=/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
    </div>
  );
}
