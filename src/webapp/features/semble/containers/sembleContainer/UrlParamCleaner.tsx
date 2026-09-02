'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { buildSembleQuery } from '@/lib/utils/link';

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
      router.replace(
        buildSembleQuery(new URLSearchParams(searchParams.toString()), {
          omit: props.paramToRemove,
        }),
        { scroll: false },
      );
    }
  }, [searchParams, router, props.paramToRemove]);

  return null;
}
