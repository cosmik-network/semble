import type { NotificationItem as NotificationItemType } from '@/api-client';
import { NotificationType } from '@/api-client';
import { Stack, Indicator, Group, Scroller, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
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

  // Mention notification - render the mentioning note/connection/collection
  if (notification.kind === 'mention') {
    const item = notification.item;
    return (
      <Indicator
        disabled={item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={item.user}
            createdAt={item.createdAt}
            type={item.type}
            mentionSource={item.mentionSource}
            note={
              item.mentionSource === 'CONNECTION'
                ? item.connection?.connection.note
                : undefined
            }
            iconColor="blue"
          />
          {item.mentionSource === 'NOTE' && item.card && (
            <UrlCard
              id={item.card.id}
              url={item.card.url}
              uri={item.card.uri}
              note={item.card.note}
              cardAuthor={item.card.author}
              cardContent={item.card.cardContent}
              urlLibraryCount={item.card.urlLibraryCount}
              urlIsInLibrary={item.card.urlInLibrary}
              urlConnectionCount={item.card.urlConnectionCount ?? 0}
              urlIsConnected={item.card.urlIsConnected}
              authorHandle={item.user.handle}
              viaCardId={item.card.id}
              analyticsContext={props.analyticsContext}
            />
          )}
          {item.mentionSource === 'CONNECTION' && item.connection && (
            <ConnectionCard connection={item.connection} />
          )}
          {item.mentionSource === 'COLLECTION' && item.mentionCollection && (
            <Box miw={'100%'} w={'100%'}>
              <CollectionCard
                collection={item.mentionCollection}
                size="compact"
              />
            </Box>
          )}
        </Stack>
      </Indicator>
    );
  }

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
                  initialIsFollowing={notification.item.user.isFollowing}
                  followSource={FollowSource.NOTIFICATIONS}
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
                  followSource={FollowSource.NOTIFICATIONS}
                />
              </Box>
            ) : (
              <Scroller>
                <Group gap="xs" wrap="nowrap">
                  {notification.item.collections.map((collection) => (
                    <Box key={collection.id} miw={'100%'} w={'100%'}>
                      <CollectionCard
                        collection={collection}
                        size="compact"
                        followSource={FollowSource.NOTIFICATIONS}
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
            urlIsConnected={notification.item.card.urlIsConnected}
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
