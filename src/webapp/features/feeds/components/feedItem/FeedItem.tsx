import type { FeedItem as FeedItemType } from '@/api-client';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import FeedActivityStatus from '../feedActivityStatus/FeedActivityStatus';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  item: FeedItemType;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function FeedItem(props: Props) {
  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <FeedActivityStatus
        user={props.item.user}
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
        authorHandle={props.item.user.handle}
        viaCardId={props.item.card.id}
        analyticsContext={props.analyticsContext}
      />
    </Stack>
  );
}
