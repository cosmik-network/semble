import type { NotificationItem as NotificationItemType } from '@/api-client';
import { NotificationType } from '@/api-client';
import { Stack, Indicator, Group, Scroller, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';
import ConnectionCard from '@/features/connections/components/connectionCard/ConnectionCard';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import { classifyNotification } from '../../lib/utils';

interface Props {
  item: NotificationItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function NotificationItem(props: Props) {
  const notification = classifyNotification(props.item);

  // Connection notification - render similar to feed item
  if (notification.kind === 'connection') {
    return (
      <Indicator
        disabled={notification.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={notification.item.user}
            createdAt={notification.item.createdAt}
            type={notification.item.type}
            note={notification.item.connection.connection.note}
            iconColor="green"
          />
          <ConnectionCard connection={notification.item.connection} />
        </Stack>
      </Indicator>
    );
  }

  // Follow notification
  if (notification.kind === 'follow') {
    return (
      <Indicator
        disabled={notification.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={notification.item.user}
            collections={notification.item.collections}
            createdAt={notification.item.createdAt}
            type={notification.item.type}
            iconColor="gray"
            followButton={
              notification.item.type === NotificationType.USER_FOLLOWED_YOU ? (
                <FollowButton
                  targetId={notification.item.user.id}
                  targetType="USER"
                  targetHandle={notification.item.user.handle}
                  initialIsFollowing={notification.item.user.isFollowing}
                />
              ) : undefined
            }
          />
          {notification.item.type ===
            NotificationType.USER_FOLLOWED_YOUR_COLLECTION &&
            notification.item.collections &&
            notification.item.collections.length > 0 &&
            (notification.item.collections.length === 1 ? (
              <Box miw={'100%'} w={'100%'}>
                <CollectionCard
                  collection={notification.item.collections[0]}
                  size="compact"
                />
              </Box>
            ) : (
              <Scroller>
                <Group gap="xs" wrap="nowrap">
                  {notification.item.collections.map((collection) => (
                    <Box miw={'100%'} w={'100%'}>
                      <CollectionCard
                        key={collection.id}
                        collection={collection}
                        size="compact"
                      />
                    </Box>
                  ))}
                </Group>
              </Scroller>
            ))}
        </Stack>
      </Indicator>
    );
  }

  // Card/collection notification
  if (notification.kind === 'cardCollection') {
    return (
      <Indicator
        disabled={notification.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={notification.item.user}
            collections={notification.item.collections}
            createdAt={notification.item.createdAt}
            type={notification.item.type}
          />
          <UrlCard
            id={notification.item.card.id}
            url={notification.item.card.url}
            uri={notification.item.card.uri}
            note={notification.item.card.note}
            cardAuthor={notification.item.card.author}
            cardContent={notification.item.card.cardContent}
            urlLibraryCount={notification.item.card.urlLibraryCount}
            urlIsInLibrary={notification.item.card.urlInLibrary}
            urlConnectionCount={notification.item.card.urlConnectionCount ?? 0}
            authorHandle={notification.item.user.handle}
            viaCardId={notification.item.card.id}
            analyticsContext={props.analyticsContext}
          />
        </Stack>
      </Indicator>
    );
  }

  // Fallback (should never reach here if all notification types are handled)
  return null;
}
