'use client';

import { ExtensionService } from '@/services/extensionService';
import { Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from '@mantine/form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSembleClient } from '@/services/client.apiClient';
import OAuthLoginForm from './OAuthLoginForm';
import AppPasswordLoginForm from './AppPasswordLoginForm';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isExtensionLogin = searchParams.get('extension-login') === 'true';
  const client = createSembleClient();

  const handleExtensionTokenGeneration = async () => {
    try {
      setIsLoading(true);
      const tokens = await client.generateExtensionTokens();

      await ExtensionService.sendTokensToExtension(tokens);

      setError('');

      // Clear the extension tokens requested flag
      ExtensionService.clearExtensionTokensRequested();

      // Redirect to extension success page after successful extension token generation
      router.push('/extension/auth/complete');
    } catch (err: any) {
      // Clear the flag even on failure
      ExtensionService.clearExtensionTokensRequested();

      // Redirect to extension error page
      router.push('/extension/auth/error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      isExtensionLogin
        ? handleExtensionTokenGeneration()
        : router.push('/home');
    }
  }, [isAuthenticated, isExtensionLogin]);

  const handleOAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validate form
    const isValid = form.validateField('handle');
    if (!isValid) return;

    try {
      setIsLoading(true);
      setError('');

      if (isExtensionLogin) {
        ExtensionService.setExtensionTokensRequested();
      }
      console.log('HANDLE', form.values.handle.trimEnd());
      const { authUrl } = await client.initiateOAuthSignIn({
        handle: form.values.handle.trimEnd(),
      });

      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validate
    const validation = form.validate();
    if (validation.hasErrors) return;

    try {
      setIsLoading(true);
      setError('');

      await client.loginWithAppPassword({
        identifier: form.values.handle.trimEnd(),
        appPassword: form.values.appPassword,
      });

      // Refresh auth state to fetch user profile with new tokens (cookies are set automatically)
      await refreshAuth();

      if (isExtensionLogin) {
        await handleExtensionTokenGeneration();
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const form = useForm({
    initialValues: {
      handle: '',
      appPassword: '',
      useAppPassword: false,
    },

    validate: {
      handle: (value) => (value.trim() ? null : 'Handle is required'),
      appPassword: (value, values) =>
        values.useAppPassword && value.trim() === ''
          ? 'App password is required'
          : null,
    },
  });

  return (
    <Stack>
      {form.values.useAppPassword ? (
        <AppPasswordLoginForm
          form={form}
          error={error}
          isLoading={isLoading}
          onSubmit={handleAppPasswordSubmit}
          onSwitchToOAuth={() => {
            form.setFieldValue('useAppPassword', false);
            setError('');
          }}
        />
      ) : (
        <OAuthLoginForm
          form={form}
          error={error}
          isLoading={isLoading}
          onSubmit={handleOAuthSubmit}
          onSwitchToAppPassword={() => {
            form.setFieldValue('useAppPassword', true);
            setError('');
          }}
        />
      )}
    </Stack>
  );
}
