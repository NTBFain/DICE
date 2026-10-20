'use client';

import { CheckCircle, ShieldAlert } from 'lucide-react';

interface DosDontsBadgeListProps {
  willDraw?: string[];
  wontDraw?: string[];
}

export default function DosDontsBadgeList({ willDraw = [], wontDraw = [] }: DosDontsBadgeListProps) {
  if (willDraw.length === 0 && wontDraw.length === 0) return null;

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
        <span>📋 ขอบเขตงานและข้อห้าม (Do&apos;s &amp; Don&apos;ts)</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Will Draw */}
        {willDraw.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> สิ่งที่รับวาด (Will Draw):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {willDraw.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg"
                >
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Won't Draw */}
        {wontDraw.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> สิ่งที่ไม่รับวาด (Won&apos;t Draw):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {wontDraw.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg"
                >
                  ✕ {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
