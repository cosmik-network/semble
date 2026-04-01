import { useLocalStorage } from '@mantine/hooks';

interface UserSettings {
  tinkerMode: boolean;
  cardView: 'grid' | 'compact' | 'list';
  collectionView: 'grid' | 'compact';
  collectionsNavExpanded: boolean;
  followingNavExpanded: boolean;
}

const defaultSettings: UserSettings = {
  tinkerMode: false,
  cardView: 'grid',
  collectionView: 'grid',
  collectionsNavExpanded: false,
  followingNavExpanded: false,
};

export function useUserSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>({
    key: 'user-settings',
    defaultValue: defaultSettings,
  });

  function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return {
    settings,
    setSettings,
    updateSetting,
  };
}
