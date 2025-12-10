import {
  Anchor,
  Avatar,
  Card,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { NotificationItem, Collection, NotificationType } from '@/api-client';
import { Fragment } from 'react';
import Link from 'next/link';
import styles from '../../../feeds/components/feedActivityStatus/FeedActivityStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { getRecordKey } from '@/lib/utils/atproto';
import { sanitizeText } from '@/lib/utils/text';

interface Props {
  user: NotificationItem['user'];
  collections?: NotificationItem['collections'];
  createdAt: string;
  type: NotificationType;
}

export default function NotificationDropdownItemActivityStatus(props: Props) {
  const MAX_DISPLAYED = 2;
  const time = getRelativeTime(props.createdAt);
  const relativeCreatedDate = time === 'just now' ? `Now` : `${time} ago`;

  const getActivityText = () => {
    const collections = props.collections ?? [];
    const displayedCollections = collections.slice(0, MAX_DISPLAYED);
    const remainingCollections = collections.slice(
      MAX_DISPLAYED,
      collections.length,
    );
    const remainingCount = collections.length - MAX_DISPLAYED;

    const userName = (
      <Text
        component={Link}
        href={`/profile/${props.user.handle}`}
        fw={600}
        c={'bright'}
      >
        {sanitizeText(props.user.name)}
      </Text>
    );

    switch (props.type) {
      case NotificationType.USER_ADDED_YOUR_CARD:
        return (
          <Fragment>
            {userName}{' '}
            {collections.length === 0 ? (
              <Text span>added your card to their library</Text>
            ) : (
              <Fragment>
                <Text span>added your card to </Text>
                {renderCollections(
                  displayedCollections,
                  remainingCollections,
                  remainingCount,
                )}
              </Fragment>
            )}
          </Fragment>
        );
      case NotificationType.USER_ADDED_YOUR_BSKY_POST:
        return (
          <Fragment>
            {userName}{' '}
            {collections.length === 0 ? (
              <Text span>added your Bluesky post to their library</Text>
            ) : (
              <Fragment>
                <Text span>added your Bluesky post to </Text>
                {renderCollections(
                  displayedCollections,
                  remainingCollections,
                  remainingCount,
                )}
              </Fragment>
            )}
          </Fragment>
        );
      case NotificationType.USER_ADDED_YOUR_COLLECTION:
        return (
          <Fragment>
            {userName}{' '}
            {collections.length === 0 ? (
              <Text span>added your collection to their library</Text>
            ) : (
              <Fragment>
                <Text span>added your collection to </Text>
                {renderCollections(
                  displayedCollections,
                  remainingCollections,
                  remainingCount,
                )}
              </Fragment>
            )}
          </Fragment>
        );
      default:
        return (
          <Fragment>
            {userName} <Text span>performed an action</Text>
          </Fragment>
        );
    }
  };

  const renderCollections = (
    displayedCollections: Collection[],
    remainingCollections: Collection[],
    remainingCount: number,
  ) => (
    <Fragment>
      {displayedCollections.map((collection: Collection, index: number) => (
        <span key={collection.id}>
          <Anchor
            component={Link}
            href={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!)}`}
            c="grape"
            fw={500}
          >
            {collection.name}
          </Anchor>
          {index < displayedCollections.length - 1 ? ', ' : ''}
        </span>
      ))}
      {remainingCount > 0 && <Text span>{' and '}</Text>}
      {remainingCount > 0 && (
        <Menu shadow="sm">
          <MenuTarget>
            <Text
              fw={600}
              c={'blue'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              span
            >
              {remainingCount} other collection
              {remainingCount > 1 ? 's' : ''}
            </Text>
          </MenuTarget>
          <MenuDropdown maw={380}>
            <ScrollArea.Autosize mah={150} type="auto">
              {remainingCollections.map((c) => (
                <MenuItem
                  key={c.id}
                  component={Link}
                  href={`/profile/${c.author.handle}/collections/${getRecordKey(c.uri!)}`}
                  target="_blank"
                  c="grape"
                  fw={600}
                >
                  {c.name}
                </MenuItem>
              ))}
            </ScrollArea.Autosize>
          </MenuDropdown>
        </Menu>
      )}
    </Fragment>
  );

  return (
    <Card p={0} className={styles.root} radius={'lg'}>
      <Stack gap={'xs'} p={'xs'}>
        <Group gap={'xs'} wrap="nowrap" align="start">
          <Avatar
            component={Link}
            href={`/profile/${props.user.handle}`}
            src={props.user.avatarUrl}
            alt={`${props.user.name}'s' avatar`}
          />
          <Text fw={500}>
            {getActivityText()}
            <Text fz={'sm'} fw={600} c={'gray'} span display={'block'}>
              {relativeCreatedDate}
            </Text>
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
