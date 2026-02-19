/**
 * Shared user lists for feature flags and analytics
 */

export const INTERNAL_HANDLES = [
  'wesleyfinck.org',
  'ronentk.me',
  'pouriade.com',
  'cosmik.network',
  'semble.so',
];

export const EARLY_TESTER_HANDLES = [
  // Add early tester handles here
  // Currently using same as internal for testing
  ...INTERNAL_HANDLES,
  'bmann.ca',
  'tynanpurdy.com',
  'erlend.sh',
  'tgoerke.bsky.social',
  'psingletary.com',
  'hilarybaumann.com',
  'atproto.science',
  'chrisshank.com',
];

/**
 * Check if a handle is an internal user
 */
export function isInternalUser(handle?: string): boolean {
  return handle ? INTERNAL_HANDLES.includes(handle) : false;
}

/**
 * Check if a handle is an early tester
 */
export function isEarlyTester(handle?: string): boolean {
  return handle ? EARLY_TESTER_HANDLES.includes(handle) : false;
}
