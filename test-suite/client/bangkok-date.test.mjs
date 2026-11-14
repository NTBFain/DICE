import test from 'node:test';
import assert from 'node:assert/strict';
import { bangkokDate } from '../../frontend/src/lib/bangkokDate.ts';
test('Bangkok date advances at17:00UTC rather than device midnight',()=>{
  assert.equal(bangkokDate(new Date('2026-11-13T16:59:59Z')),'2026-11-13');
  assert.equal(bangkokDate(new Date('2026-11-13T17:00:00Z')),'2026-11-14');
});
test('Bangkok calendar handles year boundaries',()=>{
  assert.equal(bangkokDate(new Date('2026-12-31T17:00:00Z')),'2027-01-01');
});
test('offset representations of the same instant yield the same chosen day',()=>{
  assert.equal(bangkokDate(new Date('2026-11-14T00:00:00+07:00')),bangkokDate(new Date('2026-11-13T17:00:00Z')));
});
