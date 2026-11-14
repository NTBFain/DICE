'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from '@/i18n/routing';
import { toggleSlotSubscription, checkSlotSubscriptionStatus } from '@/lib/commissionApi';

interface SlotAlertBellProps {
  artistId: number;
  serviceId?: number;
  initialSubscribed?: boolean;
  className?: string;
}

export default function SlotAlertBell({
  artistId,
  serviceId,
  initialSubscribed = false,
  className = '',
}: SlotAlertBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('ClientDashboard');
  const queryClient = useQueryClient();
  const queryKey = ['slot-subscription', user?.id, artistId, serviceId];
  const status = useQuery({ queryKey, queryFn: () => checkSlotSubscriptionStatus(artistId, serviceId), enabled: !!user, staleTime: 0 });
  const subscribed = status.data?.is_subscribed ?? initialSubscribed;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    if (status.isError) { await status.refetch(); return; }

    setLoading(true);
    setError(false);
    try {
      const res = await toggleSlotSubscription(artistId, serviceId);
      queryClient.setQueryData(queryKey, { is_subscribed: res.is_active });
    } catch (err: any) {
      console.error('Failed to toggle slot alert subscription:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || (!!user && status.isPending)}
      aria-pressed={subscribed}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        subscribed
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
          : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-700'
      } ${className}`}
      title={subscribed ? t('slotSubscribed') : t('slotSubscribe')}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : subscribed ? (
        <>
          <Check className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('slotSubscribed')}</span>
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5" />
          <span>{t('slotSubscribe')}</span>
        </>
      )}
    </button>
    {(error || status.isError) && <span role="alert" className="text-xs text-red-400">{t('slotError')}</span>}
    </span>
  );
}
