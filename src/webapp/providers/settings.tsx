import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { createContext, useContext } from 'react';

const SettingsContext = createContext<ReturnType<
  typeof useUserSettings
> | null>(null);

interface Props {
  children: React.ReactNode;
}

export function SettingsProvider(props: Props) {
  const settings = useUserSettings();
  return (
    <SettingsContext.Provider value={settings}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
