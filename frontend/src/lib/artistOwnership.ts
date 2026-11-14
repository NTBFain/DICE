type ArtistViewer = { id: number; is_artist: boolean } | null | undefined;

/** Public owner controls require the profile's owning user, never a profile ID or name. */
export function isArtistProfileOwner(viewer: ArtistViewer, ownerUserId: number | null | undefined): boolean {
  return Boolean(viewer?.is_artist && ownerUserId != null && viewer.id === ownerUserId);
}
