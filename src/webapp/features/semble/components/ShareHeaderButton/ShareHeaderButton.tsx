'use client';

import { ActionIcon, CopyButton, Menu, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'next/navigation';
import { MdIosShare } from 'react-icons/md';
import { BiCopy } from 'react-icons/bi';
import { getSembleHref } from '@/lib/utils/link';

export default function ShareHeaderButton() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get('id');

  if (!rawId) return null;

  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}${getSembleHref(rawId)}`;

  return (
    <Menu shadow="sm" position="bottom-end">
      <Menu.Target>
        <Tooltip label="Share" withArrow position="top">
          <ActionIcon variant="light" color="gray" size={36} radius={'xl'}>
            <MdIosShare />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <CopyButton value={rawId}>
          {({ copy }) => (
            <Menu.Item
              leftSection={<BiCopy />}
              onClick={() => {
                copy();
                notifications.show({
                  message: 'Link copied!',
                  position: 'top-center',
                });
              }}
            >
              Copy link
            </Menu.Item>
          )}
        </CopyButton>
        <CopyButton value={shareLink}>
          {({ copy }) => (
            <Menu.Item
              leftSection={<MdIosShare />}
              onClick={() => {
                copy();
                notifications.show({
                  message: 'Semble link copied!',
                  position: 'top-center',
                });
              }}
            >
              Copy Semble link
            </Menu.Item>
          )}
        </CopyButton>
      </Menu.Dropdown>
    </Menu>
  );
}
