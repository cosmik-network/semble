/**
 * Shared query key for the authenticated user session.
 *
 * Lives outside `hooks/useAuth.tsx` so Server Components can seed this key
 * without importing from a `'use client'` module.
 */
export const authKeys = {
  session: () => ['authenticated user'] as const,
};
