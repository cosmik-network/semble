'use client';

import { AuthProvider } from '@/hooks/useAuth';
import MantineProvider from './mantine';
import TanStackQueryProvider from './tanstack';
import { NavbarProvider } from './navbar';
import { SettingsProvider } from './settings';

interface Props {
  children: React.ReactNode;
}

export default function Providers(props: Props) {
  return (
    <TanStackQueryProvider>
      <AuthProvider>
        <MantineProvider>
          <SettingsProvider>
            <NavbarProvider>{props.children}</NavbarProvider>
          </SettingsProvider>
        </MantineProvider>
      </AuthProvider>
    </TanStackQueryProvider>
  );
}
