/** Translate only exact platform-generated titles; authored titles stay verbatim. */
export function invoiceTitle(title: string, locale: string): string {
  if(locale!=='th')return title;
  if(title==='Full Payment')return 'ชำระเต็มจำนวน';
  if(title==='Final Payment (Upon Completion)')return 'ชำระงวดสุดท้าย (เมื่องานเสร็จ)';
  const deposit=/^(\d{1,3})% Initial Deposit$/.exec(title);
  if(deposit && Number(deposit[1])<=100)return `มัดจำเริ่มต้น ${deposit[1]}%`;
  const final=/^(\d{1,3})% Final Milestone$/.exec(title);
  if(final && Number(final[1])<=100)return `ชำระงวดสุดท้าย ${final[1]}%`;
  return title;
}
