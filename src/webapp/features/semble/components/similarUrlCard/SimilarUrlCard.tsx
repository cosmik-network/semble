'use client';

import type { UrlView } from '@/api-client';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  urlView: UrlView;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function SimilarUrlCard(props: Props) {
  return (
    <UrlCard
      id={props.urlView.url}
      url={props.urlView.url}
      cardContent={props.urlView.metadata}
      urlLibraryCount={props.urlView.urlLibraryCount}
      urlIsInLibrary={props.urlView.urlInLibrary ?? false}
      analyticsContext={props.analyticsContext}
    />
  );
}
