import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceTitle } from '../../frontend/src/lib/invoiceTitle.ts';
test('standard generated milestones localize without modifying their amounts',()=>{
  assert.equal(invoiceTitle('50% Initial Deposit','th'),'มัดจำเริ่มต้น 50%');
  assert.equal(invoiceTitle('50% Final Milestone','th'),'ชำระงวดสุดท้าย 50%');
  assert.equal(invoiceTitle('Full Payment','th'),'ชำระเต็มจำนวน');
  assert.equal(invoiceTitle('Final Payment (Upon Completion)','th'),'ชำระงวดสุดท้าย (เมื่องานเสร็จ)');
  assert.equal(invoiceTitle('50% Initial Deposit','en'),'50% Initial Deposit');
});
test('custom invoice wording is preserved exactly',()=>{
  for(const title of ['Custom deposit for Mina','Deposit + 50% Initial Deposit','150% Initial Deposit','งวดพิเศษ'])assert.equal(invoiceTitle(title,'th'),title);
});
