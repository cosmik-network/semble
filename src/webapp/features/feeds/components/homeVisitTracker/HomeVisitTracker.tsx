'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavHistory } from '@/providers/navHistory';
import { useSettings } from '@/providers/settings';
import { resolveEntrySource } from '@/features/analytics/pageVisit';
import { homeFeedStateFromSettings, startHomeVisit } from '../../lib/analytics';

/**
 * Starts the analytics visit for the home feed. Lives in the layout, so
 * switching feeds and filters keeps the same visit.
 */
export default function HomeVisitTracker() {
  const startedRef = useRef(false);
  const { isAuthenticated, isLoading } = useAuth();
  const { canGoBack } = useNavHistory();
  const { settings, isHydrated } = useSettings();

  // Waits for auth so is_logged_in is accurate, and for settings so the feed
  // reported is the one the visitor actually lands on
  useEffect(() => {
    if (isLoading || !isHydrated || startedRef.current) return;
    startedRef.current = true;

    startHomeVisit(
      {
        is_logged_in: isAuthenticated,
        // Nothing links here with a `ref`, so this tells in-app arrivals
        // (`other`) from direct loads (`external`)
        entry_source: resolveEntrySource(null, canGoBack),
      },
      homeFeedStateFromSettings(settings),
    );
  }, [isLoading, isHydrated, isAuthenticated, canGoBack, settings]);

  return null;
}
