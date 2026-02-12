import type { NotificationItem as NotificationItemType } from '@/api-client';
import { NotificationType } from '@/api-client';
import { Stack, Indicator, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { useRouter } from 'next/navigation';

interface Props {
  item: NotificationItemType;
}

export default function NotificationItem(props: Props) {
  const router = useRouter();
  const isFollowNotification = props.item.type === NotificationType.USER_FOLLOWED_YOU;

  const handleClick = () => {
    if (isFollowNotification) {
      router.push(`/profile/${props.item.user.handle}`);
    }
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
        onClick={isFollowNotification ? handleClick : undefined}
        style={{
          cursor: isFollowNotification ? 'pointer' : 'default',
        }}
      >
        <Stack gap={'xs'} align="stretch" h={'100%'}>
          <NotificationActivityStatus
            user={props.item.user}
            collections={props.item.collections}
            createdAt={props.item.createdAt}
            type={props.item.type}
          />
          {props.item.card && (
            <UrlCard
              id={props.item.card.id}
              url={props.item.card.url}
              uri={props.item.card.uri}
              note={props.item.card.note}
              cardAuthor={props.item.card.author}
              cardContent={props.item.card.cardContent}
              urlLibraryCount={props.item.card.urlLibraryCount}
              urlIsInLibrary={props.item.card.urlInLibrary}
              authorHandle={props.item.user.handle}
              viaCardId={props.item.card.id}
            />
          )}
          {isFollowNotification && (
            <Box onClick={(e) => e.stopPropagation()}>
              <FollowButton
                targetId={props.item.user.id}
                targetType="USER"
                variant="light"
                size="sm"
              />
            </Box>
          )}
        </Stack>
      </Box>
    </Indicator>
  );
}
