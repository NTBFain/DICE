'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login?redirect=/orders');
      return;
    }

    if (user.is_admin) {
      router.replace('/dashboard/admin/orders');
    } else if (user.is_artist) {
      router.replace('/dashboard/artist/orders');
    } else {
      router.replace('/dashboard/client');
    }
  }, [user, loading, router]);

  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm text-neutral-400">Redirecting to orders...</p>
    </div>
  );
}
