export type AuctionPhase = 'scheduled' | 'open' | 'finalizing' | 'closed';

export function getAuctionPhase(status: string, start: number, end: number, now: number = Date.now()): AuctionPhase {
  if (status !== 'ACTIVE' || !Number.isFinite(start) || !Number.isFinite(end)) return 'closed';
  if (now < start) return 'scheduled';
  if (now >= end) return 'finalizing';
  return 'open';
}
