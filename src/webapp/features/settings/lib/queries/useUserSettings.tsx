import { useLocalStorage } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { ActivitySource, ActivityType, UrlType } from '@semble/types';
import { FeedView } from '@/features/feeds/lib/feedOptions';

export interface UserSettings {
  tinkerMode: boolean;
  cardView: 'grid' | 'compact' | 'list';
  collectionView: 'grid' | 'compact';
  collectionsNavExpanded: boolean;
  followingNavExpanded: boolean;
  contributedToNavExpanded: boolean;
  feedSource: ActivitySource | null;
  feedView: FeedView;
  feedUrlType: UrlType | null;
  feedActivityType: ActivityType | null;
  includeKnownBots: boolean;
}

const defaultSettings: UserSettings = {
  tinkerMode: false,
  cardView: 'grid',
  collectionView: 'grid',
  collectionsNavExpanded: false,
  followingNavExpanded: false,
  contributedToNavExpanded: false,
  feedSource: null,
  feedView: 'global',
  feedUrlType: null,
  feedActivityType: null,
  includeKnownBots: false,
};

/**
 * Call `useSettings()` from `@/providers/settings` instead — this hook is the
 * single instance behind it, and `SettingsProvider` is its one caller.
 *
 * Calling it directly mounts another `useLocalStorage`, and each of those
 * writes to storage and dispatches a `mantine-local-storage` event on mount
 * that every other instance answers with a re-render. It also starts from
 * `defaultSettings` until its own effect runs, so a component that mounts one
 * renders a defaults-based frame even when the app hydrated long ago.
 */
export function useUserSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>({
    key: 'user-settings',
    defaultValue: defaultSettings,
  });

  // `useLocalStorage` defaults to `getInitialValueInEffect: true`, so the
  // first render returns `defaultSettings` and a mount effect then reads
  // storage. Consumers that would act on the wrong values — firing a request,
  // rendering the wrong feed — wait on this instead.
  // This has to be an effect, not `useSyncExternalStore`: the latter reports
  // hydrated on the FIRST client render, which is still before `useLocalStorage`
  // has read storage — so consumers would act on the defaults anyway. Running
  // in a passive effect puts this flip *after* Mantine's own read effect (which
  // is registered above, in the `useLocalStorage` call), so both land in one
  // re-render with the stored values already in place. Swapping this for
  // `useSyncExternalStore` measurably reintroduced a duplicate, unfiltered
  // feed request.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    // The one cascading render is the entire point here: it is what defers
    // consumers past the storage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  const mergedSettings: UserSettings = { ...defaultSettings, ...settings };

  function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    setSettings((prev) => ({
      ...defaultSettings,
      ...prev,
      [key]: value,
    }));
  }

  return {
    settings: mergedSettings,
    setSettings,
    updateSetting,
    isHydrated,
  };
}
