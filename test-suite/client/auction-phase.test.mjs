import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuctionPhase } from '../../frontend/src/lib/auctionPhase.ts';
test('bidding opens at the start boundary and not before',()=>{
  assert.equal(getAuctionPhase('ACTIVE',100,200,99),'scheduled');
  assert.equal(getAuctionPhase('ACTIVE',100,200,100),'open');
});
test('end time stops bidding even while server finalization is delayed',()=>{
  assert.equal(getAuctionPhase('ACTIVE',100,200,199),'open');
  assert.equal(getAuctionPhase('ACTIVE',100,200,200),'finalizing');
  assert.equal(getAuctionPhase('ACTIVE',100,200,250),'finalizing');
});
test('closed, cancelled and malformed auction data never open bidding',()=>{
  for(const status of ['ENDED','CANCELLED'])assert.equal(getAuctionPhase(status,100,200,150),'closed');
  assert.equal(getAuctionPhase('ACTIVE',NaN,200,150),'closed');
});
