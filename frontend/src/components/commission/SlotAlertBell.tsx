'use client';

import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from '@/i18n/routing';
import { toggleSlotSubscription } from '@/lib/commissionApi';

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
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await toggleSlotSubscription(artistId, serviceId);
      setSubscribed(res.is_active);
    } catch (err: any) {
      console.error('Failed to toggle slot alert subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        subscribed
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
          : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-700'
      } ${className}`}
      title={subscribed ? 'กำลังรับการแจ้งเตือนเมื่อคิวเปิด' : 'กดเพื่อรับการแจ้งเตือนเมื่อคิวเปิด'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : subscribed ? (
        <>
          <Check className="w-3.5 h-3.5 text-amber-400" />
          <span>เปิดแจ้งเตือนแล้ว</span>
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5" />
          <span>แจ้งเตือนเมื่อคิวเปิด</span>
        </>
      )}
    </button>
  );
}
