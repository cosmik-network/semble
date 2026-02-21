const APPROVED_HANDLES = new Set([
  'wesleyfinck.org',
  'ronentk.me',
  'pouriade.com',
  'bmann.ca',
  'tynanpurdy.com',
  'erlend.sh',
  'tgoerke.bsky.social',
  'psingletary.com',
  'hilarybaumann.com',
  'cosmik.network',
  'semble.so',
  'atproto.science',
  'chrisshank.com',
  'jasmine-pyz.bsky.social',
  'alice.bsky.social',
  'bob.bsky.social',
]);

export function isApprovedHandle(handle: string | undefined | null): boolean {
  if (!handle) return false;
  return APPROVED_HANDLES.has(handle);
}
