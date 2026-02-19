'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { useEffect } from 'react';
import MantineProvider from './mantine';
import TanStackQueryProvider from './tanstack';
import { NavbarProvider } from './navbar';
import { SettingsProvider } from './settings';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

interface Props {
  children: React.ReactNode;
}

export default function Providers(props: Props) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_API_KEY;

    if (!posthogKey) {
      console.warn('PostHog key not found in environment variables');
      return;
    }
    if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production') {
      return;
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_API_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_API_HOST,
      defaults: '2026-01-30',
      disable_session_recording: true,
    });
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <TanStackQueryProvider>
        <AuthProvider>
          <MantineProvider>
            <SettingsProvider>
              <NavbarProvider>{props.children}</NavbarProvider>
            </SettingsProvider>
          </MantineProvider>
        </AuthProvider>
      </TanStackQueryProvider>
    </PostHogProvider>
  );
}
