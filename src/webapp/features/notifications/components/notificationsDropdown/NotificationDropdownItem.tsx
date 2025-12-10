import type { NotificationItem as NotificationItemType } from '@/api-client';
import { Indicator, Stack, Image, Group } from '@mantine/core';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';
import { useState } from 'react';

interface Props {
  item: NotificationItemType;
}

export default function NotificationDropdownItem(props: Props) {
  const [imageError, setImageError] = useState(false);

  return (
    <Indicator
      disabled={props.item.read}
      color="pink"
      size={8}
      offset={7}
      position="top-start"
    >
      <Group gap={'xs'} align="center" h={'100%'} wrap="nowrap">
        <NotificationActivityStatus
          user={props.item.user}
          collections={props.item.collections}
          createdAt={props.item.createdAt}
          type={props.item.type}
        />
        {props.item.card.cardContent.thumbnailUrl && !imageError && (
          <Image
            src={props.item.card.cardContent.thumbnailUrl}
            alt={`${props.item.card.cardContent.url} social preview image`}
            radius={'md'}
            h={45}
            w={45}
            onError={() => setImageError(true)}
          />
        )}
      </Group>
    </Indicator>
  );
}
