import { useLocalStorage } from '@mantine/hooks';
import { ActivitySource, ActivityType, UrlType } from '@semble/types';
import { FeedView } from '@/features/feeds/lib/feedOptions';

interface UserSettings {
  tinkerMode: boolean;
  cardView: 'grid' | 'compact' | 'list';
  collectionView: 'grid' | 'compact';
  collectionsNavExpanded: boolean;
  followingNavExpanded: boolean;
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
  feedSource: null,
  feedView: 'global',
  feedUrlType: null,
  feedActivityType: null,
  includeKnownBots: false,
};

export function useUserSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>({
    key: 'user-settings',
    defaultValue: defaultSettings,
  });

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
  };
}
