import type { NotificationItem as NotificationItemType } from '@/api-client';
import { NotificationType } from '@/api-client';
import { Stack, Indicator, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';
import ConnectionCard from '@/features/connections/components/connectionCard/ConnectionCard';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { useRouter } from 'next/navigation';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import { classifyNotification } from '../../lib/utils';

interface Props {
  item: NotificationItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function NotificationItem(props: Props) {
  const router = useRouter();
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
          />
          <ConnectionCard connection={notification.item.connection} />
        </Stack>
      </Indicator>
    );
  }

  // Follow notification
  if (notification.kind === 'follow') {
    const handleClick = () => {
      router.push(`/profile/${notification.item.user.handle}`);
    };

    return (
      <Indicator
        disabled={notification.item.read}
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
              user={notification.item.user}
              collections={notification.item.collections}
              createdAt={notification.item.createdAt}
              type={notification.item.type}
              followButton={
                notification.item.type ===
                NotificationType.USER_FOLLOWED_YOU ? (
                  <Box onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      targetId={notification.item.user.id}
                      targetType="USER"
                      targetHandle={notification.item.user.handle}
                      initialIsFollowing={notification.item.user.isFollowing}
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
