import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {needsQueryRecovery} from '../../frontend/src/lib/queryRecovery.ts';
const runtime=process.env.DICE_FRONTEND_RUNTIME || path.resolve(import.meta.dirname,'../../frontend');
const require=createRequire(path.join(runtime,'package.json'));
const {QueryClient,QueryObserver}=require('@tanstack/react-query');
async function failing(status){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 const options={queryKey:['recovery'],queryFn:()=>Promise.reject(status?{response:{status}}:new Error('offline'))};
 const observer=new QueryObserver(client,options);const unsubscribe=observer.subscribe(()=>{});
 await client.fetchQuery(options).catch(()=>{});return {client,query:client.getQueryCache().getAll()[0],unsubscribe};
}
test('active real query network/server failures expose recovery',async()=>{
 for(const status of [undefined,503]){const {client,query,unsubscribe}=await failing(status);assert.equal(needsQueryRecovery(query),true);unsubscribe();client.clear();}
});
test('inactive failures and expected permission/missing-record responses do not show a stale global notice',async()=>{
 for(const status of [401,403,404]){const {client,query,unsubscribe}=await failing(status);assert.equal(needsQueryRecovery(query),false);unsubscribe();client.clear();}
 const {client,query,unsubscribe}=await failing(503);unsubscribe();assert.equal(needsQueryRecovery(query),false);client.clear();
});
test('successful refetch restores data and removes the recovery notice',async()=>{
 const {client,query,unsubscribe}=await failing(503);await client.fetchQuery({queryKey:['recovery'],queryFn:async()=>({total:123.45})});assert.equal(needsQueryRecovery(query),false);assert.deepEqual(client.getQueryData(['recovery']),{total:123.45});unsubscribe();client.clear();
});
