import type {
  FeedItem as FeedItemType,
  ConnectionCreatedFeedItem,
} from '@/api-client';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import FeedActivityStatus from '../feedActivityStatus/FeedActivityStatus';
import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  item: FeedItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

function isConnectionCreatedItem(
  item: FeedItemType,
): item is ConnectionCreatedFeedItem {
  return item.activityType === 'CONNECTION_CREATED';
}

export default function FeedItem(props: Props) {
  const { item } = props;

  if (isConnectionCreatedItem(item)) {
    // CONNECTION_CREATED activity type
    return (
      <ProfileConnectionItem
        connection={item.connection}
        curator={item.user}
        showActivityStatus={true}
      />
    );
  }

  // CARD_COLLECTED activity type
  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <FeedActivityStatus
        user={item.user}
        collections={item.collections}
        createdAt={item.createdAt}
        note={item.card.note?.text}
      />
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
        authorHandle={item.user.handle}
        viaCardId={item.card.id}
        analyticsContext={props.analyticsContext}
      />
    </Stack>
  );
}
