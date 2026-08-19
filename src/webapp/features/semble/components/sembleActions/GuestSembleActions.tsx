'use client';

import { Group } from '@mantine/core';
import { TbPlugConnected } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';

export default function GuestSembleActions() {
  const loginHref = useLoginHref();

  return (
    <Group gap={'xs'}>
      <LinkButton
        href={loginHref}
        variant="light"
        color="green"
        radius={'xl'}
        leftSection={<TbPlugConnected size={18} />}
      >
        Log in to connect
      </LinkButton>
      <LinkButton href={loginHref}>Log in to add</LinkButton>
    </Group>
  );
}
