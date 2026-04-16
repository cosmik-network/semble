'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sanitizeReturnTo } from './returnTo';

export function useLoginHref(): string {
  const pathname = usePathname();
  const [href, setHref] = useState('/login');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.pathname + window.location.search;
    if (!current || current === '/') {
      setHref('/login');
      return;
    }
    const safe = sanitizeReturnTo(current);
    setHref(safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login');
  }, [pathname]);

  return href;
}
