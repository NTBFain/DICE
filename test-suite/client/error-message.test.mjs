import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getErrorMessage, getDownloadErrorMessage } from '../../frontend/src/lib/errorMessage.ts';

test('registration validation arrays become safe, useful text', () => {
  assert.equal(getErrorMessage({ response: { data: { detail: [{ loc: ['body','password'], msg: 'Password too short', type: 'value_error' }] } } }, 'Try again'), 'Password too short');
});
test('duplicate account errors remain readable', () => {
  assert.equal(getErrorMessage({ response: { data: { detail: 'Email already registered' } } }, 'Try again'), 'Email already registered');
});
test('network failures and unexpected payloads have a safe fallback', () => {
  for (const error of [null, new Error('offline'), { response: { data: { detail: [{ unexpected: true }] } } }]) assert.equal(getErrorMessage(error, 'Try again'), 'Try again');
});

test('download errors decode JSON blobs and safely handle other data', async () => {
  const error = { response: { data: new Blob([JSON.stringify({ detail: 'Full payment required' })], {type:'application/json'}) } };
  assert.equal(await getDownloadErrorMessage(error,'Try again'),'Full payment required');
  error.response.data = new Blob(['invalid'],{type:'application/json'});
  assert.equal(await getDownloadErrorMessage(error,'Try again'),'Try again');
});
