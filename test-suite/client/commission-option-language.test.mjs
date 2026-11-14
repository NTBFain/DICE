import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getCommissionOptionText } from '../../frontend/src/lib/commissionBlockText.ts';

test('platform default labels translate both ways', () => {
  const stored = 'ระบุท่าทางเฉพาะเจาะจง (Custom Pose)';
  assert.equal(getCommissionOptionText(stored, 'en'), 'Specify a pose (Custom Pose)');
  assert.equal(getCommissionOptionText('Specify a pose (Custom Pose)', 'th'), stored);
});
test('custom artist wording remains verbatim in both locales', () => {
  for (const text of ['QA preferred delivery format', 'สีฟ้าตามแบบของลูกค้า', 'Custom scenic tier']) {
    assert.equal(getCommissionOptionText(text, 'en'), text);
    assert.equal(getCommissionOptionText(text, 'th'), text);
  }
});
