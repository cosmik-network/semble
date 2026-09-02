'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Stack, Loader, Text } from '@mantine/core';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout().catch((error) => {
      console.error('Logout error:', error);
      // Force a full reload to home if logout fails, so no half-cleared
      // auth state survives
      window.location.assign(window.location.origin);
    });
  }, [logout]);

  return (
    <Stack align="center" gap="md" mt="xl">
      <Loader type="dots" />
      <Text>Logging you out...</Text>
    </Stack>
  );
}
