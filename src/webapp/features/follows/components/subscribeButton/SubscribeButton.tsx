'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { MdNotificationAdd, MdNotificationsActive } from 'react-icons/md';
import { useState } from 'react';
import { SubscriptionScope } from '@semble/types';
import SubscribeModal from './SubscribeModal';

interface Props {
  targetId: string;
  targetType: 'COLLECTION' | 'USER';
  initialIsSubscribed?: boolean;
  initialScopes?: SubscriptionScope[];
}

export default function SubscribeButton({
  targetId,
  targetType,
  initialIsSubscribed,
  initialScopes,
}: Props) {
  const [isSubscribed, setIsSubscribed] = useState(
    initialIsSubscribed ?? false,
  );
  const [scopes, setScopes] = useState<SubscriptionScope[]>(
    initialScopes ?? [],
  );
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Tooltip label="Notification settings">
        <ActionIcon
          size="lg"
          variant={isSubscribed ? 'filled' : 'light'}
          color={isSubscribed ? 'tangerine' : 'gray'}
          radius="xl"
          aria-label="Notification settings"
          onClick={() => setOpened(true)}
        >
          {isSubscribed ? (
            <MdNotificationsActive size={18} />
          ) : (
            <MdNotificationAdd size={18} />
          )}
        </ActionIcon>
      </Tooltip>

      <SubscribeModal
        opened={opened}
        onClose={() => setOpened(false)}
        targetId={targetId}
        targetType={targetType}
        isSubscribed={isSubscribed}
        initialScopes={scopes}
        onSubscribedChange={(next, nextScopes) => {
          setIsSubscribed(next);
          setScopes(next ? nextScopes : []);
        }}
      />
    </>
  );
}
