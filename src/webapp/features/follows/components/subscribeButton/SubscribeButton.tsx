'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubscriptionScope } from '@semble/types';
import { MdNotificationAdd, MdNotificationsActive } from 'react-icons/md';
import SubscribeModal from './SubscribeModal';
import { useSubscriptionState } from '../../lib/queries/useSubscriptionState';
import { useSaveSubscription } from '../../lib/mutations/useSaveSubscription';
import { FollowTargetType } from '../../lib/types';

interface Props {
  targetId: string;
  targetType: FollowTargetType;
  initialIsSubscribed?: boolean;
  initialScopes?: SubscriptionScope[];
}

export default function SubscribeButton({
  targetId,
  targetType,
  initialIsSubscribed,
  initialScopes,
}: Props) {
  const target = { targetId, targetType };
  const { isSubscribed, scopes } = useSubscriptionState(target, {
    isSubscribed: initialIsSubscribed,
    scopes: initialScopes,
  });
  const { saveSubscription } = useSaveSubscription(target);
  const [opened, { open, close }] = useDisclosure(false);

  const handleConfirm = (nextScopes: SubscriptionScope[]) => {
    // optimistic: close right away, the bell reflects the new state
    // immediately and rolls back with a toast if the request fails
    close();
    saveSubscription(nextScopes);
  };

  return (
    <>
      <Tooltip label="Notification settings">
        <ActionIcon
          size="lg"
          variant="light"
          color="gray"
          radius="xl"
          aria-label="Notification settings"
          onClick={open}
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
        onClose={close}
        targetType={targetType}
        isSubscribed={isSubscribed}
        currentScopes={scopes}
        onConfirm={handleConfirm}
      />
    </>
  );
}
