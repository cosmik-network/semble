'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Center, Loader, Stack, Title, Text } from '@mantine/core';

function AuthCompleteContent() {
  const [message, setMessage] = useState('Processing your login...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const error = searchParams.get('error');

      // Check for error parameter
      if (error) {
        console.error('Authentication error:', error);
        router.push(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      // With cookie-based auth, tokens are automatically set in cookies by the backend
      // No need to handle tokens from URL parameters anymore
      setMessage('Authentication successful!');

      // Redirect to home after a brief moment
      router.push('/home');
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <Stack align="center">
      <Stack gap={0} align="center">
        <Title order={2}>Signing you in...</Title>
        <Text>{message}</Text>
      </Stack>
      <Loader type="dots" />
    </Stack>
  );
}

export default function AuthCompletePage() {
  return (
    <Center h={'100svh'}>
      <Suspense
        fallback={
          <Card>
            <Stack align="center">
              <Title order={2}>Loading</Title>
              <Loader />
            </Stack>
          </Card>
        }
      >
        <AuthCompleteContent />
      </Suspense>
    </Center>
  );
}
