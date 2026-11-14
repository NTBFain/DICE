import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomTheme } from '../../frontend/src/lib/customThemeValidation.ts';

test('native picker hex colors and trimmed bilingual names are accepted', () => {
  assert.equal(validateCustomTheme(' Studio ', ' สตูดิโอ ', ['#123456','#abcdef','#ABCDEF','#000000']), null);
});
test('malformed, incomplete and extra-channel colors are rejected', () => {
  for (const color of ['#ZZZZZZ','#abc','#12345','#12345678','red','','#123456 ']) {
    assert.equal(validateCustomTheme('Studio','สตูดิโอ',['#123456',color]), 'color', color);
  }
});
test('blank or oversized names cannot become saved theme records', () => {
  for (const [name,nameTh] of [[' ','สตูดิโอ'],['Studio',' '],['x'.repeat(81),'สตูดิโอ']]) {
    assert.equal(validateCustomTheme(name,nameTh,['#123456']), 'name');
  }
});
