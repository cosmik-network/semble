'use client';

import type { UrlView } from '@/api-client';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';

interface Props {
  urlView: UrlView;
  semblePageUrl?: string;
  analyticsContext?: CardSaveAnalyticsContext;
  // Keeps the save/connect state in sync after the user acts on the card.
  // Off by default so lists that don't need it skip the extra request.
  liveStats?: boolean;
}

export default function SimilarUrlCard(props: Props) {
  return props.liveStats ? (
    <LiveSimilarUrlCard {...props} />
  ) : (
    <StaticSimilarUrlCard {...props} />
  );
}

function StaticSimilarUrlCard(props: Props) {
  const { urlView } = props;

  return (
    <UrlCard
      id={urlView.url}
      url={urlView.url}
      cardContent={urlView.metadata}
      urlLibraryCount={urlView.urlLibraryCount}
      urlIsInLibrary={urlView.urlInLibrary ?? false}
      urlConnectionCount={urlView.urlConnectionCount ?? 0}
      urlIsConnected={urlView.urlIsConnected}
      semblePageUrl={props.semblePageUrl}
      analyticsContext={props.analyticsContext}
    />
  );
}

/**
 * Reads counts and caller-relative status from the shared urlMetadata query,
 * which the save and connect mutations invalidate — so acting on a card
 * updates it in place without refetching the surrounding list.
 */
function LiveSimilarUrlCard(props: Props) {
  const { urlView } = props;

  const { data } = useUrlMetadata({
    url: urlView.url,
    includeStats: true,
    initialData: {
      stats: {
        libraryCount: urlView.urlLibraryCount,
        noteCount: 0,
        collectionCount: 0,
        connections: {
          all: { total: urlView.urlConnectionCount ?? 0 },
          incoming: { total: 0 },
          outgoing: { total: 0 },
        },
      },
      urlInLibrary: urlView.urlInLibrary,
      urlIsConnected: urlView.urlIsConnected,
    },
  });

  return (
    <UrlCard
      id={urlView.url}
      url={urlView.url}
      cardContent={urlView.metadata}
      urlLibraryCount={data?.stats?.libraryCount ?? urlView.urlLibraryCount}
      urlIsInLibrary={data?.urlInLibrary ?? urlView.urlInLibrary ?? false}
      urlConnectionCount={
        data?.stats?.connections.all.total ?? urlView.urlConnectionCount ?? 0
      }
      urlIsConnected={data?.urlIsConnected ?? urlView.urlIsConnected}
      semblePageUrl={props.semblePageUrl}
      analyticsContext={props.analyticsContext}
    />
  );
}
