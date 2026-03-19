import type {
  NotificationItem as NotificationItemType,
  ConnectionCreatedNotificationItem,
  CardCollectionNotificationItem,
  FollowNotificationItem,
} from '@/api-client';
import { NotificationType } from '@/api-client';
import { Stack, Indicator, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { useRouter } from 'next/navigation';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';

interface Props {
  item: NotificationItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

function isConnectionCreatedNotification(
  item: NotificationItemType,
): item is ConnectionCreatedNotificationItem {
  return item.type === NotificationType.USER_CONNECTED_YOUR_URL;
}

function isCardCollectionNotification(
  item: NotificationItemType,
): item is CardCollectionNotificationItem {
  return (
    item.type === NotificationType.USER_ADDED_YOUR_CARD ||
    item.type === NotificationType.USER_ADDED_YOUR_BSKY_POST ||
    item.type === NotificationType.USER_ADDED_YOUR_COLLECTION ||
    item.type === NotificationType.USER_ADDED_TO_YOUR_COLLECTION
  );
}

function isFollowNotificationItem(
  item: NotificationItemType,
): item is FollowNotificationItem {
  return (
    item.type === NotificationType.USER_FOLLOWED_YOU ||
    item.type === NotificationType.USER_FOLLOWED_YOUR_COLLECTION
  );
}

export default function NotificationItem(props: Props) {
  const router = useRouter();

  // Connection notification - render similar to feed item
  if (isConnectionCreatedNotification(props.item)) {
    return (
      <Indicator
        disabled={props.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <ProfileConnectionItem
          connection={props.item.connection}
          curator={props.item.user}
          activityStatusText="connected a card in your library"
        />
      </Indicator>
    );
  }

  // Follow notification
  if (isFollowNotificationItem(props.item)) {
    const handleClick = () => {
      router.push(`/profile/${props.item.user.handle}`);
    };

    return (
      <Indicator
        disabled={props.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Box
          onClick={handleClick}
          style={{
            cursor: 'pointer',
          }}
        >
          <Stack gap={'xs'} align="stretch" h={'100%'}>
            <NotificationActivityStatus
              user={props.item.user}
              collections={undefined}
              createdAt={props.item.createdAt}
              type={props.item.type}
              followButton={
                props.item.type === NotificationType.USER_FOLLOWED_YOU ? (
                  <Box onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      targetId={props.item.user.id}
                      targetType="USER"
                      targetHandle={props.item.user.handle}
                      initialIsFollowing={props.item.user.isFollowing}
                      followText="Follow back"
                    />
                  </Box>
                ) : undefined
              }
            />
          </Stack>
        </Box>
      </Indicator>
    );
  }

  // Card/collection notification
  if (isCardCollectionNotification(props.item)) {
    return (
      <Indicator
        disabled={props.item.read}
        color="tangerine"
        size={8}
        offset={3}
        position="top-start"
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={props.item.user}
            collections={props.item.collections}
            createdAt={props.item.createdAt}
            type={props.item.type}
          />
          <UrlCard
            id={props.item.card.id}
            url={props.item.card.url}
            uri={props.item.card.uri}
            note={props.item.card.note}
            cardAuthor={props.item.card.author}
            cardContent={props.item.card.cardContent}
            urlLibraryCount={props.item.card.urlLibraryCount}
            urlIsInLibrary={props.item.card.urlInLibrary}
            urlConnectionCount={props.item.card.urlConnectionCount ?? 0}
            authorHandle={props.item.user.handle}
            viaCardId={props.item.card.id}
            analyticsContext={props.analyticsContext}
          />
        </Stack>
      </Indicator>
    );
  }

  // Fallback (should never reach here if all notification types are handled)
  return null;
}
