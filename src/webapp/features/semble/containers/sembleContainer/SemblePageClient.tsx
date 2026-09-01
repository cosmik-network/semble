'use client';

import { useRef, useEffect } from 'react';
import { buildSembleQuery } from '@/lib/utils/link';

interface Props {
  viaCardId?: string;
  children: React.ReactNode;
}

/**
 * Client wrapper that cleans viaCardId from URL after server captures it.
 * Uses children prop pattern to maintain server component status for nested components.
 */
export default function SemblePageClient(props: Props) {
  const cleanedUrlRef = useRef(false);

  // Clean URL on mount if viaCardId exists
  useEffect(() => {
    if (props.viaCardId && !cleanedUrlRef.current) {
      const params = new URLSearchParams(window.location.search);
      window.history.replaceState(
        null,
        '',
        buildSembleQuery(params, { omit: 'viaCardId' }),
      );
      cleanedUrlRef.current = true;
    }
  }, [props.viaCardId]);

  return <>{props.children}</>;
}
