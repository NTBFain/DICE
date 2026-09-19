'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function OrderRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (loading) return;
    if (!id) return;

    if (!user) {
      router.replace(`/login?redirect=/orders/${id}`);
      return;
    }

    if (user.is_admin) {
      router.replace(`/dashboard/admin/orders?order=${id}`);
    } else if (user.is_artist) {
      router.replace(`/dashboard/artist/orders?order=${id}`);
    } else {
      router.replace(`/dashboard/client?order=${id}`);
    }
  }, [user, loading, id, router]);

  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm text-neutral-400">Redirecting to order details...</p>
    </div>
  );
}
