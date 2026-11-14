import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getSocialLink } from '../../frontend/src/lib/socialLink.ts';

test('saved web addresses produce usable external links', () => {
  assert.equal(getSocialLink('https://example.com/artist','twitter'),'https://example.com/artist');
  assert.equal(getSocialLink('pixiv.net/users/123','pixiv'),'https://pixiv.net/users/123');
  assert.equal(getSocialLink('discord.gg/artist','discord'),'https://discord.gg/artist');
});
test('supported social identifiers resolve to profiles', () => {
  assert.equal(getSocialLink('@sample_artist','twitter'),'https://x.com/sample_artist');
  assert.equal(getSocialLink('123','pixiv'),'https://www.pixiv.net/users/123');
});
test('non-web schemes and non-URL contact names do not become links', () => {
  for (const value of ['javascript:alert(1)','data:text/html,test','//example.com/artist','artist#1234']) assert.equal(getSocialLink(value,'discord'),undefined);
});
