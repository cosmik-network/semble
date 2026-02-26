'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExtensionService } from '@/services/extensionService';
import { ApiClient } from '@/api-client/ApiClient';
import { Card, Center, Loader, Stack, Title, Text } from '@mantine/core';

function AuthCompleteContent() {
  const [message, setMessage] = useState('Processing your login...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      // Create API client instance
      const apiClient = new ApiClient(
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000',
      );

      const error = searchParams.get('error');

      // Check for error parameter
      if (error) {
        console.error('Authentication error:', error);
        router.push(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      const handleExtensionTokenGeneration = async () => {
        try {
          setMessage('Generating extension tokens...');

          const tokens = await apiClient.generateExtensionTokens();
          await ExtensionService.sendTokensToExtension(tokens);
          ExtensionService.clearExtensionTokensRequested();

          setMessage('Extension tokens generated successfully!');

          // Redirect to extension success page after successful extension token generation
          setTimeout(() => router.push('/extension/auth/complete'), 1000);
        } catch (extensionError: any) {
          console.error('Failed to generate extension tokens:', extensionError);
          ExtensionService.clearExtensionTokensRequested();

          // Redirect to extension error page
          router.push('/extension/auth/error');
        }
      };

      // With cookie-based auth, tokens are automatically set in cookies by the backend
      // No need to handle tokens from URL parameters anymore
      setMessage('Authentication successful!');

      // Check if extension tokens were requested
      if (ExtensionService.isExtensionTokensRequested()) {
        handleExtensionTokenGeneration();
      } else {
        // Redirect to home after a brief moment
        setTimeout(() => router.push('/home'), 500);
      }
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
