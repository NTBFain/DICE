import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculateCommissionPrice, roundMoney } from '../../frontend/src/lib/commissionMoney.ts';

test('mixed fixed fees and a fractional-cent character surcharge match saved server total', () => {
  assert.equal(calculateCommissionPrice(1100.25,[500.15,25.25],[70]),2395.83);
  assert.equal(calculateCommissionPrice(2395.83,[],[50],false),1197.92);
});
test('decimal rates sum before rounding and exact half cents round away from zero', () => {
  assert.equal(calculateCommissionPrice(1000.25,[25.25],[10.5,20]),1330.58);
  assert.equal(calculateCommissionPrice(100,[],[0.1,0.1,0.1]),100.30);
  assert.equal(roundMoney(2.675),2.68);
  assert.equal(roundMoney(-2.675),-2.68);
});
test('individual line fees and non-half boundaries preserve cent totals', () => {
  assert.equal(calculateCommissionPrice(1100.25,[],[70],false),770.18);
  assert.equal(calculateCommissionPrice(1100.25,[25.25],[],false),25.25);
  assert.equal(calculateCommissionPrice(0.1,[0.2]),0.3);
  assert.equal(calculateCommissionPrice(1e-7,[0.005]),0.01);
});

test('rush previews use cent rounding at fractional-cent boundaries', () => {
  assert.equal(calculateCommissionPrice(123.45, [], [50], false), 61.73);
  assert.equal(calculateCommissionPrice(123.45, [], [25], false), 30.86);
});
