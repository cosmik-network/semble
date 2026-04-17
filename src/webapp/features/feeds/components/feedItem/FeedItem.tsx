import type { FeedItem as FeedItemType } from '@/api-client';
import { ActivityType } from '@/api-client';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import FeedActivityStatus from '../feedActivityStatus/FeedActivityStatus';
import ConnectionFeedItem from '../connectionFeedItem/ConnectionFeedItem';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  item: FeedItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function FeedItem(props: Props) {
  if (props.item.activityType === ActivityType.CONNECTION_CREATED) {
    return <ConnectionFeedItem item={props.item} />;
  }

  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <FeedActivityStatus
        user={props.item.user}
        activityType={ActivityType.CARD_COLLECTED}
        collections={props.item.collections}
        createdAt={props.item.createdAt}
        note={props.item.card.note?.text}
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
        urlIsConnected={props.item.card.urlIsConnected}
        authorHandle={props.item.user.handle}
        viaCardId={props.item.card.id}
        analyticsContext={props.analyticsContext}
      />
    </Stack>
  );
}
