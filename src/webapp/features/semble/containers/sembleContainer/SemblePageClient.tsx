'use client';

import { useRef, useEffect } from 'react';
import { buildSembleQuery } from '@/lib/utils/link';
import { useSembleNavigation } from '../../lib/sembleNavigation';
import SembleContainerSkeleton from './Skeleton.SembleContainer';

interface Props {
  viaCardId?: string;
  children: React.ReactNode;
}

/**
 * Client wrapper that cleans viaCardId from URL after server captures it,
 * and shows the skeleton while navigating to another semble page.
 * Uses children prop pattern to maintain server component status for nested components.
 */
export default function SemblePageClient(props: Props) {
  const cleanedUrlRef = useRef(false);
  const isNavigating = useSembleNavigation()?.isNavigating;

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

  return isNavigating ? <SembleContainerSkeleton /> : props.children;
}
