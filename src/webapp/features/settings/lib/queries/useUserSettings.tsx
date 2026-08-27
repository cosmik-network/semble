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
  /**
   * The Bluesky account a signed-out reader is reading the following feed of.
   * Only the guest branch of `MyFeedContainer` consults it — a session names
   * its own subject — and it is per-browser, like every other setting here.
   */
  bskyHandle: string | null;
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
  bskyHandle: null,
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
 *
 * That defaults-based frame was doing a second job, though: it also meant a
 * server-rendered component always agreed with the server's own defaults on
 * its first client render, whenever that render happened. Reading the shared
 * provider gives that up — the provider has already read storage by the time
 * anything in a later hydration pass renders, so a component that renders a
 * stored value inside a Suspense boundary now hydrates against server HTML
 * built from the defaults, and React refuses to patch the mismatch up.
 * `CollectionsNavListContent` is the one place this bites today, and it holds
 * the server's value for one render with `useMounted()` from `@mantine/hooks`.
 * Anything else that SSRs a stored setting from inside a streamed boundary
 * needs to do the same.
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

  /**
   * Write several keys as one change. Each separate write stringifies the
   * whole object, hits storage, and broadcasts a `mantine-local-storage`
   * event — so a handler that sets four keys one at a time broadcasts three
   * combinations that never logically existed, which another open tab then
   * applies in turn.
   */
  function updateSettings(patch: Partial<UserSettings>) {
    setSettings((prev) => ({
      ...defaultSettings,
      ...prev,
      ...patch,
    }));
  }

  function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    updateSettings({ [key]: value } as Partial<UserSettings>);
  }

  return {
    settings: mergedSettings,
    updateSetting,
    updateSettings,
    isHydrated,
  };
}
