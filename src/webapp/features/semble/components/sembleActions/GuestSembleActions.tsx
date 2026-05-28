import { Group } from '@mantine/core';
import { TbPlugConnected } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';

export default function GuestSembleActions() {
  return (
    <Group gap={'xs'}>
      <LinkButton
        href={'/login'}
        variant="light"
        color="green"
        radius={'xl'}
        leftSection={<TbPlugConnected size={18} />}
      >
        Log in to connect
      </LinkButton>
      <LinkButton href={'/login'}>Log in to add</LinkButton>
    </Group>
  );
}
