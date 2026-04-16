'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sanitizeReturnTo } from './returnTo';

export function useLoginUrlWithReturnTo(): string {
  const pathname = usePathname();
  const [url, setUrl] = useState('/login');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.pathname + window.location.search;
    if (!current || current === '/') {
      setUrl('/login');
      return;
    }
    const safe = sanitizeReturnTo(current);
    setUrl(safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login');
  }, [pathname]);

  return url;
}
