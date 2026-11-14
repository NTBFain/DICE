type QueryLike = {isActive():boolean;state:{status:string;error:unknown}};
/** Expected permission/missing-record responses keep their page-specific treatment. */
export function needsQueryRecovery(query: QueryLike): boolean {
  if(!query.isActive() || query.state.status!=='error')return false;
  const status=(query.state.error as {response?:{status?:number}} | null)?.response?.status;
  return status===undefined || status>=500;
}
