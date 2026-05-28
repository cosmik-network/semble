import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { createContext, use } from 'react';

const SettingsContext = createContext<ReturnType<
  typeof useUserSettings
> | null>(null);

interface Props {
  children: React.ReactNode;
}

export function SettingsProvider(props: Props) {
  const settings = useUserSettings();
  return <SettingsContext value={settings}>{props.children}</SettingsContext>;
}

export function useSettings() {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
