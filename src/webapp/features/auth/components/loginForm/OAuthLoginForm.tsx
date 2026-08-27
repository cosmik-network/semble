'use client';

import {
  Stack,
  Text,
  Button,
  Alert,
  UnstyledButton,
  Anchor,
} from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import { useState } from 'react';
import { UseFormReturnType } from '@mantine/form';
import BlueskyHandleInput from '@/features/platforms/bluesky/components/blueskyHandleInput/BlueskyHandleInput';

interface LoginFormValues {
  handle: string;
  appPassword: string;
  useAppPassword: boolean;
}

type LoginFormType = UseFormReturnType<LoginFormValues>;

interface Props {
  form: LoginFormType;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.SubmitEvent) => void;
  /** A handle chosen from the dropdown: signs in with it directly. */
  onSelectHandle: (handle: string) => void;
  onSwitchToAppPassword: () => void;
}

export default function OAuthLoginForm(props: Props) {
  const [inputValue, setInputValue] = useState(props.form.values.handle);
  return (
    <Stack gap="xl">
      <form onSubmit={props.onSubmit}>
        <Stack align="center">
          <BlueskyHandleInput
            autoComplete="username"
            inputKey={props.form.key('handle')}
            value={inputValue}
            onChange={(value) => {
              setInputValue(value);
              props.form.setFieldValue('handle', value);
            }}
            onSelect={(handle) => {
              setInputValue(handle);
              props.form.setFieldValue('handle', handle);
              props.onSelectHandle(handle);
            }}
            required
          />

          <Button
            type="submit"
            size="lg"
            color="var(--mantine-color-dark-filled)"
            fullWidth
            rightSection={<BiRightArrowAlt size={22} />}
            loading={props.isLoading}
          >
            Log in
          </Button>

          {props.error && <Alert title={props.error} color="red" />}

          <Stack align="center" gap={0}>
            <UnstyledButton
              c={'gray'}
              fw={500}
              fz={'sm'}
              onClick={props.onSwitchToAppPassword}
            >
              Or{' '}
              <Text c={'blue'} fw={500} fz={'sm'} span>
                use your app password
              </Text>
            </UnstyledButton>

            <Text fw={500} fz={'sm'} c={'gray'}>
              {"Don't have an account? "}
              <Anchor href="/signup" fw={500} fz={'sm'} c={'blue'}>
                Sign up
              </Anchor>
            </Text>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );
}
