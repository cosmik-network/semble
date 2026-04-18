import {
  Anchor,
  Box,
  Card,
  Group,
  Menu,
  MenuDropdown,
  MenuTarget,
  ScrollArea,
  Spoiler,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  NotificationItem,
  Collection,
  NotificationType,
  CollectionAccessType,
} from '@/api-client';

import { Fragment } from 'react';
import styles from '../../../feeds/components/feedActivityStatus/FeedActivityStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { getRecordKey } from '@/lib/utils/atproto';
import { sanitizeText } from '@/lib/utils/text';
import { getNotificationTypeIcon } from '../../lib/utils/icon';
import {
  LinkAvatar,
  LinkMenuItem,
  LinkText,
} from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';

interface Props {
  user: NotificationItem['user'];
  collections?: Collection[];
  createdAt: string;
  type: NotificationType;
  followButton?: React.ReactNode;
  note?: string;
  iconColor?: string;
}

export default function NotificationActivityStatus(props: Props) {
  const MAX_DISPLAYED = 2;
  const time = getRelativeTime(props.createdAt);
  const TypeIcon = getNotificationTypeIcon(props.type);

  const getActivityText = () => {
    const collections = props.collections ?? [];
    const displayedCollections = collections.slice(0, MAX_DISPLAYED);
    const remainingCollections = collections.slice(
      MAX_DISPLAYED,
      collections.length,
    );
    const remainingCount = collections.length - MAX_DISPLAYED;

    const userName = (
      <Group gap={'xs'} wrap="nowrap">
        <LinkText href={`/profile/${props.user.handle}`} fw={600} c={'bright'}>
          {sanitizeText(props.user.name)}
        </LinkText>
        {isBotAccount(props.user) && <BotLabel />}
      </Group>
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
              <Text span>added your post to their library</Text>
            ) : (
              <Fragment>
                <Text span>added your post to </Text>
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
      case NotificationType.USER_ADDED_TO_YOUR_COLLECTION:
        return (
          <Fragment>
            {userName}{' '}
            {collections.length === 0 ? (
              <Text span>added a card to your collection</Text>
            ) : (
              <Fragment>
                <Text span>added a card to </Text>
                {renderCollections(
                  displayedCollections,
                  remainingCollections,
                  remainingCount,
                )}
              </Fragment>
            )}
          </Fragment>
        );
      case NotificationType.USER_FOLLOWED_YOU:
        return (
          <Fragment>
            {userName} <Text span>started following you</Text>
          </Fragment>
        );
      case NotificationType.USER_FOLLOWED_YOUR_COLLECTION:
        return (
          <Fragment>
            {userName}{' '}
            {collections.length === 0 ? (
              <Text span>started following your collection</Text>
            ) : (
              <Fragment>
                <Text span>started following </Text>
                {renderCollections(
                  displayedCollections,
                  remainingCollections,
                  remainingCount,
                )}
              </Fragment>
            )}
          </Fragment>
        );
      case NotificationType.USER_CONNECTED_YOUR_URL:
        return (
          <Fragment>
            {userName} <Text span>connected a card in your library</Text>
          </Fragment>
        );
      case NotificationType.USER_CONNECTED_YOUR_POST:
        return (
          <Fragment>
            {userName} <Text span>connected your post</Text>
          </Fragment>
        );
      case NotificationType.USER_CONNECTED_YOUR_COLLECTION:
        return (
          <Fragment>
            {userName} <Text span>connected your collection</Text>
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
            href={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!)}`}
            c={
              collection.accessType === CollectionAccessType.OPEN
                ? 'green'
                : 'grape'
            }
            fw={500}
          >
            {collection.name}
          </Anchor>
          {index < displayedCollections.length - 1 ? ', ' : ''}
        </span>
      ))}
      {remainingCount > 0 && <Text span>{' and '}</Text>}
      {remainingCount > 0 && (
        <Menu shadow="sm" position="bottom-start">
          <MenuTarget>
            <Text
              fw={600}
              c={'gray'}
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
                <LinkMenuItem
                  key={c.id}
                  href={`/profile/${c.author.handle}/collections/${getRecordKey(c.uri!)}`}
                  target="_blank"
                  c="grape"
                  fw={600}
                >
                  {c.name}
                </LinkMenuItem>
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
        <Group gap={'xs'} justify="space-between" wrap="nowrap">
          <Group gap={'xs'} align="center" wrap="nowrap">
            <Box
              pos="relative"
              style={{ display: 'inline-block', flexShrink: 0 }}
            >
              <LinkAvatar
                href={`/profile/${props.user.handle}`}
                src={props.user.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${props.user.name}'s' avatar`}
              />
              {TypeIcon && (
                <ThemeIcon
                  size={20}
                  radius="xl"
                  pos="absolute"
                  bottom={-4}
                  right={-5}
                  color={props.iconColor}
                  style={{
                    border:
                      '2px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))',
                  }}
                >
                  <TypeIcon size={10} />
                </ThemeIcon>
              )}
            </Box>

            <Text fw={500}>
              {getActivityText()}
              <Text fz={'sm'} fw={600} c={'gray'} display={'block'} span>
                {time}
              </Text>
            </Text>
          </Group>
          <Box style={{ flexShrink: 0 }}>{props.followButton}</Box>
        </Group>
        {props.note && (
          <Spoiler
            showLabel={'Read more'}
            hideLabel={'See less'}
            maxHeight={100}
          >
            <Text fw={500} fs={'italic'} c={'gray'}>
              {props.note}
            </Text>
          </Spoiler>
        )}
      </Stack>
    </Card>
  );
}
