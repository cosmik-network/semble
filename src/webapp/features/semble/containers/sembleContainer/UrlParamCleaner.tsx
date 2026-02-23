'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Props {
  paramToRemove: string;
}

/**
 * Client component that removes a query parameter from the URL without scrolling
 */
export default function UrlParamCleaner(props: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const paramValue = searchParams.get(props.paramToRemove);
    if (paramValue) {
      // Manually build query string to avoid re-encoding the URL
      const params: string[] = [];
      searchParams.forEach((value, key) => {
        if (key !== props.paramToRemove) {
          params.push(`${key}=${value}`);
        }
      });
      router.replace(`?${params.join('&')}`, { scroll: false });
    }
  }, [searchParams, router, props.paramToRemove]);

  return null;
}
