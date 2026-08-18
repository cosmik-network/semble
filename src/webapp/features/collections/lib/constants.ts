// Shared between the navbar collections list, Composer, and the server
// prefetches in app/(dashboard)/layout.tsx and app/onboarding/page.tsx — the
// prefetch key must match the client query key or the client refetches.
export const NAV_COLLECTIONS_LIMIT = 30;
