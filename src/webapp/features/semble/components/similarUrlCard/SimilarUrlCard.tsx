'use client';

import type { UrlView } from '@/api-client';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import useUrlStatus from '@/features/cards/lib/queries/useUrlStatus';

interface Props {
  urlView: UrlView;
  semblePageUrl?: string;
  analyticsContext?: CardSaveAnalyticsContext;
}

/**
 * Counts and caller-relative status come from a per-URL query seeded with the
 * list's values, which the save and connect mutations invalidate — so acting on
 * a card updates it in place without refetching the surrounding list.
 */
export default function SimilarUrlCard(props: Props) {
  const { urlView } = props;

  const { data } = useUrlStatus({
    url: urlView.url,
    initialData: {
      libraryCount: urlView.urlLibraryCount,
      connectionCount: urlView.urlConnectionCount ?? 0,
      inLibrary: urlView.urlInLibrary,
      isConnected: urlView.urlIsConnected,
    },
  });

  return (
    <UrlCard
      id={urlView.url}
      url={urlView.url}
      cardContent={urlView.metadata}
      urlLibraryCount={data.libraryCount}
      urlIsInLibrary={data.inLibrary ?? false}
      urlConnectionCount={data.connectionCount}
      urlIsConnected={data.isConnected}
      semblePageUrl={props.semblePageUrl}
      analyticsContext={props.analyticsContext}
    />
  );
}
