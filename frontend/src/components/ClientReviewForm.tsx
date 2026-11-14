'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthContext';
import { apiClient, getOrders } from '@/lib/api';

export default function ClientReviewForm({ handle, artistUserId, onSubmitted }: {
  handle: string;
  artistUserId?: number;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const t = useTranslations('ClientDashboard');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const { data: orders, isPending, isError } = useQuery({
    queryKey: ['client-orders'], queryFn: getOrders, enabled: !!user,
  });
  const mutation = useMutation({
    mutationFn: () => apiClient.post(`/artists/${encodeURIComponent(handle)}/reviews`, { rating: Number(rating), comment: comment.trim() }),
    onSuccess: () => { setComment(''); onSubmitted(); },
  });
  if (!user || user.id === artistUserId) return null;
  if (isPending) return <p role="status">{t('checkingReviewEligibility')}</p>;
  if (isError) return <p role="alert">{t('reviewEligibilityError')}</p>;
  const eligible = orders?.some(order => order.artist_id === artistUserId && order.status === 'COMPLETED');
  if (!eligible) return <p className="text-sm text-neutral-500">{t('reviewRequiresCompletion')}</p>;
  return (
    <form className="space-y-3 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700" onSubmit={event => {
      event.preventDefault();
      if (comment.trim() && !mutation.isPending) mutation.mutate();
    }}>
      <h3 className="font-bold">{t('writeReview')}</h3>
      <label className="block text-sm" htmlFor="review-rating">{t('reviewRating')}</label>
      <select id="review-rating" value={rating} onChange={event => setRating(event.target.value)} className="rounded border bg-neutral-100 p-2 text-neutral-900">
        {[5,4,3,2,1].map(value => <option key={value} value={value}>{value} / 5</option>)}
      </select>
      <label className="block text-sm" htmlFor="review-comment">{t('reviewComment')}</label>
      <textarea id="review-comment" required maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} className="w-full rounded border border-neutral-400 bg-transparent p-3" />
      <button disabled={!comment.trim() || mutation.isPending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{mutation.isPending ? t('submitting') : t('submitReview')}</button>
      {mutation.isError && <p role="alert" className="text-sm text-red-500">{t('reviewError')}</p>}
      {mutation.isSuccess && <p role="status" className="text-sm text-emerald-500">{t('reviewSaved')}</p>}
    </form>
  );
}
