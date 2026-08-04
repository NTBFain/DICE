import React from 'react';
import { Palette } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in-scale">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center animate-bounce shadow-lg">
          <Palette className="w-7 h-7 text-blue-400" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500"></span>
        </span>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-white animate-pulse">
          Loading Studio Canvas...
        </p>
        <p className="text-[10px] text-neutral-500 font-mono">DICE Atelier Platform</p>
      </div>
    </div>
  );
}
