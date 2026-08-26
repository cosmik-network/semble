'use client';

import { useRouter } from 'next/navigation';
import { useSettings } from '@/providers/settings';
import { FeedDestination, feedSettingsFor } from './feedDestinations';

/**
 * /home reads its state from user settings rather than the URL, so a
 * destination is reached by writing that state and then navigating. The whole
 * destination goes down as one patch, which is what `feedSettingsFor` already
 * describes it as.
 */
export function useFeedDestination() {
  const router = useRouter();
  // `useSettings` rather than `useUserSettings`: twelve tiles call this hook,
  // and every direct `useUserSettings` is its own `useLocalStorage` — which
  // writes to storage and dispatches a `mantine-local-storage` event on mount
  // that every other instance answers with a re-render. The provider in
  // `providers/index.tsx` already holds one instance for the whole app.
  const { updateSettings } = useSettings();

  const select = (destination: FeedDestination) => {
    updateSettings(feedSettingsFor(destination));
    router.push('/home');
  };

  return { select };
}
