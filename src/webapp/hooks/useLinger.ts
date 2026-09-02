'use client';

import { useEffect, useState } from 'react';

/**
 * Follows `active`, but stays true for `ms` after it goes false, so something
 * that finishes quickly still plays its animation instead of flashing.
 */
export default function useLinger(active: boolean, ms: number): boolean {
  const [isLingering, setIsLingering] = useState(false);
  const [wasActive, setWasActive] = useState(active);

  // Adjusted during render rather than in an effect, which would leave the
  // result a frame behind.
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setIsLingering(true);
  }

  useEffect(() => {
    if (!isLingering) return;

    const timer = setTimeout(() => setIsLingering(false), ms);
    return () => clearTimeout(timer);
  }, [isLingering, ms]);

  return active || isLingering;
}
