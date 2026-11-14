'use client';

import { useState } from 'react';
import { Calculator, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface EstimateSelection {
  characterScope: 'bust' | 'half' | 'full';
  usageType: 'personal' | 'commercial';
  backgroundType: 'simple' | 'complex';
  expressDelivery: boolean;
}

export default function PriceCalculator({ onProceed, initialSelection }: {
  onProceed: (brief: string, selection: EstimateSelection) => void;
  initialSelection?: EstimateSelection;
}) {
  const t = useTranslations('ClientDashboard');
  const c = useTranslations('ClientWidgets');
  const [characterScope, setCharacterScope] = useState<EstimateSelection['characterScope']>(initialSelection?.characterScope ?? 'half');
  const [usageType, setUsageType] = useState<EstimateSelection['usageType']>(initialSelection?.usageType ?? 'personal');
  const [backgroundType, setBackgroundType] = useState<EstimateSelection['backgroundType']>(initialSelection?.backgroundType ?? 'simple');
  const [expressDelivery, setExpressDelivery] = useState(initialSelection?.expressDelivery ?? false);

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
            <Calculator className="w-3.5 h-3.5 text-blue-400" /> {c('estimator')}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{c('calculator')}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{c('calculatorDescription')}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between hover-lift">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{c('estimate')}</span>
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
              {c('scope')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bust', label: c('bust'), price: '฿1,200' },
                { id: 'half', label: c('half'), price: '฿2,200' },
                { id: 'full', label: c('full'), price: '฿3,800' },
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
              {c('license')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'personal', label: c('personal'), desc: c('personalDescription') },
                { id: 'commercial', label: c('commercial'), desc: c('commercialDescription') },
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
              {c('background')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'simple', label: c('simple'), price: c('free') },
                { id: 'complex', label: c('complex'), price: '+฿1,200' },
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
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {c('express')}
                  </div>
                  <div className="text-[10px] text-neutral-400">{c('priority')}</div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 space-y-3">
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1.5 text-[11px] text-neutral-400">
              <p>{t('estimateDisclaimer')}</p>
            </div>

            <button
              type="button"
              onClick={() => onProceed([
                `Coverage: ${{ bust: 'Bust-Up', half: 'Half Body', full: 'Full Body' }[characterScope]}`,
                `Usage: ${usageType}`, `Background: ${backgroundType}`,
                `Express delivery requested: ${expressDelivery ? 'Yes' : 'No'}`,
                `Provisional example estimate: THB ${totalPrice}. Artist confirmation required.`,
              ].join('\n'), { characterScope, usageType, backgroundType, expressDelivery })}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{t('proceedRequest')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
