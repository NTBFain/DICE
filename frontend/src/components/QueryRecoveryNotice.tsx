'use client';
import {useCallback,useSyncExternalStore} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useLocale} from 'next-intl';
import {needsQueryRecovery} from '@/lib/queryRecovery';

export default function QueryRecoveryNotice(){
  const client=useQueryClient(),cache=client.getQueryCache(),locale=useLocale();
  const subscribe=useCallback((notify:()=>void)=>cache.subscribe(notify),[cache]);
  const snapshot=useCallback(()=>cache.getAll().filter(needsQueryRecovery).map(query=>query.queryHash+':'+query.state.fetchStatus).join('|'),[cache]);
  const failures=useSyncExternalStore(subscribe,snapshot,()=> '');
  if(!failures)return null;
  const fetching=cache.getAll().some(query=>needsQueryRecovery(query)&&query.state.fetchStatus==='fetching');
  return <aside role="alert" aria-live="polite" className="m-3 rounded-xl border border-amber-500/50 bg-amber-950 px-4 py-3 text-sm text-amber-100 flex flex-wrap items-center justify-between gap-3">
    <p>{locale==='th'?'โหลดข้อมูลบางส่วนไม่สำเร็จ ข้อมูลที่กรอกไว้ยังคงอยู่ โปรดลองอีกครั้ง':'Some information could not load. Your entered information is preserved. Please try again.'}</p>
    <button type="button" disabled={fetching} onClick={()=>{void client.refetchQueries({predicate:needsQueryRecovery}).catch(()=>{});}} className="rounded-lg border border-amber-300 px-3 py-2 font-bold focus-visible:outline focus-visible:outline-2 disabled:opacity-50">
      {locale==='th'?(fetching?'กำลังลองใหม่…':'ลองอีกครั้ง'):(fetching?'Retrying…':'Retry loading')}
    </button>
  </aside>;
}
