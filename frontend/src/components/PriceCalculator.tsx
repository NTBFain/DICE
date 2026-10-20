'use client';

import { useState } from 'react';
import { Calculator, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from './AuthContext';

export default function PriceCalculator() {
  const { user } = useAuth();
  const [characterScope, setCharacterScope] = useState<'bust' | 'half' | 'full'>('half');
  const [usageType, setUsageType] = useState<'personal' | 'commercial'>('personal');
  const [backgroundType, setBackgroundType] = useState<'simple' | 'complex'>('simple');
  const [expressDelivery, setExpressDelivery] = useState(false);

  // Price calculation logic
  const scopePrices = {
    bust: 1200,
    half: 2200,
    full: 3800,
  };

  const bgPrice = backgroundType === 'complex' ? 1200 : 0;
  const expressPrice = expressDelivery ? 1000 : 0;
  const basePrice = scopePrices[characterScope] + bgPrice + expressPrice;
  const multiplier = usageType === 'commercial' ? 1.8 : 1.0;
  const totalPrice = Math.round(basePrice * multiplier);

  return (
    <div className="w-full max-w-5xl mx-auto bg-neutral-900/40 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 my-4 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-neutral-800/80 text-neutral-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-neutral-700/50 mb-1.5">
            <Calculator className="w-3.5 h-3.5 text-blue-400" /> Commission Estimator
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Price & Package Calculator</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Instant estimate for custom artwork orders.</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between hover-lift">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Estimated Price</span>
          <span key={totalPrice} className="text-xl sm:text-2xl font-black text-blue-400 inline-block animate-number-pop">
            ฿{totalPrice.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Scope & Usage */}
        <div className="space-y-5">
          {/* Character Scope */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 block">
              1. Coverage Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bust', label: 'Bust-Up', price: '฿1,200' },
                { id: 'half', label: 'Half Body', price: '฿2,200' },
                { id: 'full', label: 'Full Body', price: '฿3,800' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCharacterScope(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    characterScope === item.id
                      ? 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{item.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Usage License */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 block">
              2. Usage License
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'personal', label: 'Personal Use', desc: 'Social profile, collection' },
                { id: 'commercial', label: 'Commercial Use', desc: 'Merch, VTuber, monetize (1.8x)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setUsageType(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    usageType === item.id
                      ? 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Background & Add-ons */}
        <div className="space-y-5 flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 block">
              3. Background Detail
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'simple', label: 'Simple / Solid', price: 'Free' },
                { id: 'complex', label: 'Full Environment', price: '+฿1,200' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBackgroundType(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    backgroundType === item.id
                      ? 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{item.price}</div>
                </button>
              ))}
            </div>

            {/* Fast Track checkbox */}
            <div className="mt-4">
              <label className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={expressDelivery}
                  onChange={(e) => setExpressDelivery(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Express 3-Day Delivery (+฿1,000)
                  </div>
                  <div className="text-[10px] text-neutral-400">Expedited queue priority</div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 space-y-3">
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1.5 text-[11px] text-neutral-400">
              <div className="font-bold text-neutral-300 text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Commission Rules & TOS Summary
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-neutral-400">
                <li>Deposit 50% required upon price agreement to lock queue slot.</li>
                <li>Includes 3 free WIP draft revision rounds before final lineart.</li>
                <li>Final high-res PNG & PSD files delivered without watermark upon balance completion.</li>
              </ul>
            </div>

            <Link
              href={user ? (user.is_admin ? '/dashboard/admin' : '/dashboard/client') : '/login'}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{user ? 'Proceed with Order Request' : 'Sign In to Request Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
