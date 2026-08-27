'use client';

import { Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSembleClient } from '@/services/client.apiClient';
import OAuthLoginForm from './OAuthLoginForm';
import AppPasswordLoginForm from './AppPasswordLoginForm';

interface Props {
  // Validated app-relative path to land on after signing in.
  redirectPath?: string;
}

export default function LoginForm(props: Props) {
  const router = useRouter();
  const { isAuthenticated, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const postLoginPath = props.redirectPath ?? '/home';

  const client = createSembleClient();

  useEffect(() => {
    if (isAuthenticated) {
      router.push(postLoginPath);
    }
  }, [isAuthenticated]);

  // Takes the handle rather than reading it back off the form: a dropdown
  // selection submits before `form.values` has caught up with it.
  const submitOAuth = async (handle: string) => {
    const value = handle.trimEnd();
    if (!value.trim()) {
      form.setFieldError('handle', 'Handle is required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { authUrl } = await client.initiateOAuthSignIn({
        handle: value,
        redirect: props.redirectPath,
      });

      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOAuth(form.values.handle);
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
      router.push(postLoginPath);
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
          onSelectHandle={submitOAuth}
          onSwitchToAppPassword={() => {
            form.setFieldValue('useAppPassword', true);
            setError('');
          }}
        />
      )}
    </Stack>
  );
}
