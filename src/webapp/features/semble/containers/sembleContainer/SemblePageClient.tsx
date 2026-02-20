'use client';

import { useState, useEffect } from 'react';

interface Props {
  viaCardId?: string;
  children: React.ReactNode;
}

/**
 * Client wrapper that cleans viaCardId from URL after server captures it.
 * Uses children prop pattern to maintain server component status for nested components.
 */
export default function SemblePageClient(props: Props) {
  const [cleanedUrl, setCleanedUrl] = useState(false);

  // Clean URL on mount if viaCardId exists
  useEffect(() => {
    if (props.viaCardId && !cleanedUrl) {
      // Manually build query string to avoid re-encoding the URL
      const params = new URLSearchParams(window.location.search);
      const queryParts: string[] = [];
      params.forEach((value, key) => {
        if (key !== 'viaCardId') {
          queryParts.push(`${key}=${value}`);
        }
      });
      window.history.replaceState(null, '', `?${queryParts.join('&')}`);
      setCleanedUrl(true);
    }
  }, [props.viaCardId, cleanedUrl]);

  return <>{props.children}</>;
}
