import { useLocalStorage } from '@mantine/hooks';

interface UserSettings {
  tinkerMode: boolean;
  cardView: 'grid' | 'list';
}

const defaultSettings: UserSettings = {
  tinkerMode: false,
  cardView: 'grid',
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
