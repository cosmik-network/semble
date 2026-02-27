'use client';

import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { UrlCard } from '@semble/types';
import SembleCollectionCardContent from './SembleCollectionCardContent';
import LinkCardContent from './LinkCardContent';
import BlueskyPost from '@/features/platforms/bluesky/components/blueskyPost/BlueskyPost';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import BlueskyPostSkeleton from '@/features/platforms/bluesky/components/blueskyPost/Skeleton.BlueskyPost';
import YoutubeVideo from '@/features/platforms/youtube/components/YoutubeVideo/YoutubeVideo';
import SpotifyEmbed from '@/features/platforms/spotify/components/SpotifyEmbed/SpotifyEmbed';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import PlyrfmTrack from '@/features/platforms/plyrfm/components/plyrfmTrack/PlyrFmTrack';
import UrlCardContentSkeleton from './Skeleton.UrlCardContent';

interface Props {
  url: string;
  uri?: string;
  cardContent: UrlCard['cardContent'];
  authorHandle?: string;
}

export default function UrlCardContent(props: Props) {
  const platform = detectUrlPlatform(props.url);
  const { settings } = useUserSettings();

  if (platform.type === SupportedPlatform.SEMBLE_COLLECTION) {
    if (!platform.handle || !platform.rkey) {
      return (
        <LinkCardContent
          cardContent={props.cardContent}
          uri={props.uri}
          authorHandle={props.authorHandle}
        />
      );
    }
    return (
      <ErrorBoundary
        fallback={
          <LinkCardContent
            cardContent={props.cardContent}
            uri={props.uri}
            authorHandle={props.authorHandle}
          />
        }
      >
        <Suspense fallback={<UrlCardContentSkeleton />}>
          <SembleCollectionCardContent
            rkey={platform.rkey}
            handle={platform.handle}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (
    platform.type === SupportedPlatform.BLUESKY_POST ||
    platform.type === SupportedPlatform.BLACKSKY_POST
  ) {
    return (
      <ErrorBoundary
        fallback={
          <LinkCardContent
            cardContent={props.cardContent}
            uri={props.uri}
            authorHandle={props.authorHandle}
          />
        }
      >
        <Suspense fallback={<BlueskyPostSkeleton />}>
          <BlueskyPost
            url={props.url}
            fallbackCardContent={
              <LinkCardContent
                cardContent={props.cardContent}
                uri={props.uri}
                authorHandle={props.authorHandle}
              />
            }
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (
    platform.type === SupportedPlatform.YOUTUBE_VIDEO &&
    settings.cardView !== 'list'
  ) {
    return <YoutubeVideo url={platform.url} cardContent={props.cardContent} />;
  }

  if (
    platform.type === SupportedPlatform.SPOTIFY &&
    settings.cardView !== 'list'
  ) {
    return <SpotifyEmbed url={platform.url} cardContent={props.cardContent} />;
  }

  if (
    platform.type === SupportedPlatform.PLYRFM_TRACK &&
    settings.cardView !== 'list'
  ) {
    return <PlyrfmTrack url={platform.url} cardContent={props.cardContent} />;
  }

  return (
    <LinkCardContent
      cardContent={props.cardContent}
      uri={props.uri}
      authorHandle={props.authorHandle}
    />
  );
}
