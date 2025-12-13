import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { UrlCard } from '@semble/types';
import SembleCollectionCardContent from './SembleCollectionCardContent';
import LinkCardContent from './LinkCardContent';
import BlueskyPost from '@/features/platforms/bluesky/components/blueskyPost/BlueskyPost';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import BlueskyPostSkeleton from '@/features/platforms/bluesky/components/blueskyPost/Skeleton.BlueskyPost';
import YoutubeVideo from '@/features/platforms/youtube/components/YoutubeVideo/YoutubeVideo';

interface Props {
  url: string;
  cardContent: UrlCard['cardContent'];
}

export default function UrlCardContent(props: Props) {
  const platform = detectUrlPlatform(props.url);

  if (platform.type === SupportedPlatform.SEMBLE_COLLECTION) {
    return <SembleCollectionCardContent cardContent={props.cardContent} />;
  }

  if (
    platform.type === SupportedPlatform.BLUESKY_POST ||
    platform.type === SupportedPlatform.BLACKSKY_POST
  ) {
    return (
      <ErrorBoundary
        fallback={<LinkCardContent cardContent={props.cardContent} />}
      >
        <Suspense fallback={<BlueskyPostSkeleton />}>
          <BlueskyPost
            url={props.url}
            fallbackCardContent={
              <LinkCardContent cardContent={props.cardContent} />
            }
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (platform.type === SupportedPlatform.YOUTUBE_VIDEO) {
    return <YoutubeVideo url={platform.url} cardContent={props.cardContent} />;
  }

  return <LinkCardContent cardContent={props.cardContent} />;
}
