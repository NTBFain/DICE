'use client';
import { useLocale } from 'next-intl';
import { briefWords, commissionBriefRows, type CommissionBrief } from '@/lib/commissionBrief';

export default function CommissionBriefView({brief,fallback}:{brief?:CommissionBrief|null;fallback?:string}) {
  const locale=useLocale(),w=briefWords(locale);
  if(!brief)return <p className="text-sm whitespace-pre-wrap break-words">{fallback}</p>;
  return <section aria-label={w.brief} className="space-y-3 text-sm min-w-0">
    <dl className="grid gap-3 sm:grid-cols-2">
      {commissionBriefRows(brief,locale).map((row,index)=><div key={index} className="min-w-0">
        <dt className="text-xs opacity-70">{row.label}</dt>
        <dd className="whitespace-pre-wrap break-words mt-1">{row.value}</dd>
      </div>)}
    </dl>
    {brief.tos_snapshot && <details className="border-t border-current/20 pt-2">
      <summary className="cursor-pointer">{w.terms} ({w.version} {brief.tos_version})</summary>
      <p className="mt-2 whitespace-pre-wrap break-words">{brief.tos_snapshot}</p>
    </details>}
  </section>;
}
