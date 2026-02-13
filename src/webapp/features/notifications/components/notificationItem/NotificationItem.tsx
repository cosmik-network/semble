import type { NotificationItem as NotificationItemType } from '@/api-client';
import { Stack, Indicator } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import NotificationActivityStatus from '../notificationActivityStatus/NotificationActivityStatus';

interface Props {
  item: NotificationItemType;
}

export default function NotificationItem(props: Props) {
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
      </Stack>
    </Indicator>
  );
}
