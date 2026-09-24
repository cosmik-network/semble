// Number of collections shown in each sidebar nav section (mine/following/
// contributed).
export const NAV_COLLECTIONS_LIMIT = 7;

// Number of "my collections" offered by Composer's collection picker when
// saving a card. Must match the prefetches in app/(dashboard)/layout.tsx and
// app/onboarding/page.tsx, which render Composer — a mismatched key makes the
// suspense query fetch during SSR, where its client DAL throws NoSessionError.
export const COMPOSER_COLLECTIONS_LIMIT = 30;
