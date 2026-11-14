import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseApiDate } from '../../frontend/src/lib/apiDate.ts';

test('timezone-naive API timestamps represent UTC, including microseconds', () => {
  assert.equal(parseApiDate('2026-11-13T23:51:18.712740').toISOString(), '2026-11-13T23:51:18.712Z');
  assert.equal(parseApiDate('2026-11-13T23:51').toISOString(), '2026-11-13T23:51:00.000Z');
});
test('Bangkok invoice date and message time cross the UTC midnight boundary correctly', () => {
  const date = parseApiDate('2026-11-13T23:51:18.712740');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const field = type => parts.find(part => part.type === type).value;
  assert.equal(`${field('year')}-${field('month')}-${field('day')}`, '2026-11-14');
  assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(date), '06:51');
});
test('explicit offsets and date-only values retain their existing meaning', () => {
  const instant = Date.UTC(2026, 10, 13, 23, 51, 18);
  assert.equal(parseApiDate('2026-11-13T23:51:18Z').getTime(), instant);
  assert.equal(parseApiDate('2026-11-14T06:51:18+07:00').getTime(), instant);
  assert.equal(parseApiDate('2026-11-14').toISOString(), '2026-11-14T00:00:00.000Z');
  assert.ok(Number.isNaN(parseApiDate('invalid').getTime()));
});
