import type { NotificationItem as NotificationItemType } from '@/api-client';
import { Indicator, Image, Group, Anchor } from '@mantine/core';
import { useState } from 'react';
import NotificationDropdownItemActivityStatus from './NotificationDropdownItemActivityStatus';
import Link from 'next/link';

interface Props {
  item: NotificationItemType;
}

export default function NotificationDropdownItem(props: Props) {
  const [imageError, setImageError] = useState(false);

  return (
    <Indicator
      disabled={props.item.read}
      position={'top-start'}
      size={8}
      offset={4}
      color="tangerine"
    >
      <Group gap={'xs'} align="center" h={'100%'} wrap="nowrap">
        <NotificationDropdownItemActivityStatus
          user={props.item.user}
          collections={props.item.collections}
          createdAt={props.item.createdAt}
          type={props.item.type}
        />
        {props.item.card.cardContent.thumbnailUrl && !imageError && (
          <Anchor component={Link} href={props.item.card.url} target="_blank">
            <Image
              src={props.item.card.cardContent.thumbnailUrl}
              alt={`${props.item.card.cardContent.url} social preview image`}
              radius={'md'}
              h={45}
              w={45}
              onError={() => setImageError(true)}
            />
          </Anchor>
        )}
      </Group>
    </Indicator>
  );
}
