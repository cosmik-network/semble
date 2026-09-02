'use client';

import { Card, Group, Stack, Text } from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import { LinkButton } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';
import classes from './AccountSummary.module.css';

export default function GuestAccountSummary() {
  const loginHref = useLoginHref();

  return (
    <Card p={'sm'} radius={'lg'} classNames={{ root: classes.root }}>
      <Stack gap={'sm'}>
        <Text fw={600} fz={'md'}>
          Log in to manage your account
        </Text>
        <Group gap={'xs'}>
          <LinkButton href="/signup" size="md">
            Sign up
          </LinkButton>
          <LinkButton
            href={loginHref}
            color="var(--mantine-color-dark-filled)"
            size="md"
            rightSection={<BiRightArrowAlt size={22} />}
          >
            Log in
          </LinkButton>
        </Group>
      </Stack>
    </Card>
  );
}
