'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { getLoginPathWithRedirect } from '@/lib/auth/redirect';

/**
 * Login link that remembers the page it was clicked from, so the user lands
 * back there after signing in.
 */
export function useLoginHref(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return getLoginPathWithRedirect(search ? `${pathname}?${search}` : pathname);
}
