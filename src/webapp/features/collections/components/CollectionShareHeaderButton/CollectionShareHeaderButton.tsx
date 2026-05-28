'use client';

import { ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MdIosShare } from 'react-icons/md';

interface Props {
  handle: string;
  rkey: string;
}

export default function CollectionShareHeaderButton(props: Props) {
  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/profile/${props.handle}/collections/${props.rkey}`;

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
            onClick={(e) => {
              e.stopPropagation();
              copy();

              if (copied) return;
              notifications.show({
                message: 'Link copied!',
                position: 'top-center',
                id: `${props.handle}/${props.rkey}`,
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
