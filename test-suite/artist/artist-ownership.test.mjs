import test from 'node:test';
import assert from 'node:assert/strict';
import { isArtistProfileOwner } from '../../frontend/src/lib/artistOwnership.ts';

test('user/profile ID collision and artist display names cannot confer ownership', () => {
  const mainArtist = { id: 2, is_artist: true, full_name: 'Akira' };
  // The visited profile is profile2, but belongs to user6.
  assert.equal(isArtistProfileOwner(mainArtist, 6), false);
});

test('actual owner with distinct user and profile IDs retains controls', () => {
  assert.equal(isArtistProfileOwner({ id: 6, is_artist: true }, 6), true);
  assert.equal(isArtistProfileOwner({ id: 8, is_artist: true }, 8), true);
});

test('guest, revoked artist and absent owner metadata fail closed', () => {
  assert.equal(isArtistProfileOwner(null, 6), false);
  assert.equal(isArtistProfileOwner({ id: 6, is_artist: false }, 6), false);
  assert.equal(isArtistProfileOwner({ id: 2, is_artist: true }, undefined), false);
});
