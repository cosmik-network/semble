// Number of collections shown in each sidebar nav section (mine/following/
// contributed). Must match the matching prefetch in app/(dashboard)/layout.tsx
// or the client refetches.
export const NAV_COLLECTIONS_LIMIT = 7;

// Number of "my collections" offered by Composer's collection picker when
// saving a card. Must match the prefetch in app/onboarding/page.tsx, which
// renders Composer, or the client refetches.
export const COMPOSER_COLLECTIONS_LIMIT = 30;
