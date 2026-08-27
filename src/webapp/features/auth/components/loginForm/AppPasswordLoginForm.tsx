'use client';

import {
  Stack,
  Text,
  Button,
  Alert,
  UnstyledButton,
  PasswordInput,
  Anchor,
} from '@mantine/core';
import { MdLock } from 'react-icons/md';
import { BiRightArrowAlt } from 'react-icons/bi';
import { useRef, useState } from 'react';
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
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToOAuth: () => void;
}

export default function AppPasswordLoginForm(props: Props) {
  const [inputValue, setInputValue] = useState(props.form.values.handle);
  const appPasswordRef = useRef<HTMLInputElement>(null);

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
              // Can't sign them in on the choice alone — the password is still
              // required — so hand them the field that is.
              appPasswordRef.current?.focus();
            }}
            required
          />

          <PasswordInput
            ref={appPasswordRef}
            autoComplete="password"
            name="password"
            label="App password"
            placeholder="Your password"
            key={props.form.key('appPassword')}
            {...props.form.getInputProps('appPassword')}
            leftSection={<MdLock size={22} />}
            variant="filled"
            size="lg"
            w={'100%'}
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

          <Stack gap={0} align="center">
            <UnstyledButton
              c={'gray'}
              fw={600}
              fz={'sm'}
              onClick={props.onSwitchToOAuth}
            >
              Or{' '}
              <Text c={'blue'} fw={500} fz={'sm'} span>
                log in with OAuth
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
