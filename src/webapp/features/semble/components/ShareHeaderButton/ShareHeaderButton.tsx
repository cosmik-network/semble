'use client';

import { ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'next/navigation';
import { MdIosShare } from 'react-icons/md';

export default function ShareHeaderButton() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get('id');

  if (!rawId) return null;

  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/url?id=${rawId}`;

  return (
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
            <MdIosShare />
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}
