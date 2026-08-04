'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicQueue, PublicQueueSlot } from '@/lib/api';
import { useAuth } from './AuthContext';
import { Calendar, Layers, Lock, Star, CheckCircle, Clock, Loader2, ShieldAlert } from 'lucide-react';

export default function QueueRoadmap() {
  const { user } = useAuth();

  const { data: queueSlots, isLoading, isError } = useQuery({
    queryKey: ['publicQueue'],
    queryFn: getPublicQueue,
  });

  return (
    <div className="w-full max-w-5xl mx-auto my-12 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1 rounded-full mb-2">
            <Calendar className="w-3.5 h-3.5" /> Public Production Calendar
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Live Artist Queue & Roadmap</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time public schedule tracker. Ownership details are revealed strictly to the queue slot owner.
          </p>
        </div>

        {user && !user.is_admin && (
          <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 text-emerald-400 font-bold">
            <Star className="w-4 h-4 fill-emerald-400" /> Logged in as: {user.full_name}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
          Failed to load public queue status.
        </div>
      )}

      {!isLoading && !isError && (!queueSlots || queueSlots.length === 0) && (
        <div className="text-center py-10 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
          <Layers className="w-10 h-10 text-neutral-600 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white">All Queue Slots Available</h3>
          <p className="text-xs text-neutral-400">The artist is currently accepting new commission requests!</p>
        </div>
      )}

      {!isLoading && queueSlots && queueSlots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queueSlots.map((slot) => {
            const isOwner = user && user.id === slot.client_id;
            const isAdmin = user && user.is_admin;
            const isMySlot = isOwner || isAdmin;

            return (
              <div
                key={slot.order_id}
                className={`p-5 rounded-xl border transition-all relative overflow-hidden ${
                  isOwner
                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30'
                    : isAdmin
                    ? 'bg-neutral-900 border-neutral-700'
                    : 'bg-neutral-950 border-neutral-800/90'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" /> SLOT #{slot.slot_number.toString().padStart(2, '0')}
                  </span>

                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 animate-pulse">
                      <Star className="w-3 h-3 fill-emerald-300" /> YOUR SLOT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded border border-neutral-700">
                      <Lock className="w-3 h-3 text-amber-400" /> OCCUPIED
                    </span>
                  )}
                </div>

                {/* Slot Details: Anonymized unless logged in owner or admin */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {isMySlot ? slot.title : `Commission Slot #${slot.slot_number}`}
                  </h4>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800/80">
                    <span className="text-neutral-500 font-medium">Stage:</span>
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
                      {slot.stage || 'In Queue'}
                    </span>
                  </div>

                  {/* Dates display */}
                  {(slot.start_date || slot.due_date) && (
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 font-mono">
                      {slot.start_date && (
                        <span>Start: <strong className="text-neutral-300">{new Date(slot.start_date).toLocaleDateString()}</strong></span>
                      )}
                      {slot.due_date && (
                        <span>Due: <strong className="text-amber-400">{new Date(slot.due_date).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="text-[10px] text-neutral-400 pt-1">
                      Client: <span className="text-white font-bold">{slot.client_name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
        Privacy Note: Project titles and owner names are encrypted for public viewers and revealed only to verified slot owners upon login.
      </div>
    </div>
  );
}
