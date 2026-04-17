'use client';

import { ActionIcon, CopyButton, Group, Tooltip } from '@mantine/core';
import { MdIosShare } from 'react-icons/md';
import { notifications } from '@mantine/notifications';
import { TbPlugConnected } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  url: string;
}

export default function GuestSembleActions(props: Props) {
  const shareLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/url?id=${props.url}`
      : '';

  return (
    <Group gap={'xs'}>
      <CopyButton value={shareLink}>
        {({ copied, copy }) => (
          <Tooltip
            label={copied ? 'Link copied!' : 'Share'}
            withArrow
            position="top"
          >
            <ActionIcon
              variant="light"
              color="gray"
              size={36}
              radius={'xl'}
              onClick={() => {
                copy();

                if (copied) return;
                notifications.show({
                  message: 'Link copied!',
                  position: 'top-center',
                  id: copied.toString(),
                });
              }}
            >
              <MdIosShare size={22} />
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
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
