'use client';

import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { UrlCard } from '@semble/types';
import SembleCollectionCardContent from './SembleCollectionCardContent';
import LinkCardContent from './LinkCardContent';
import BlueskyPost from '@/features/platforms/bluesky/components/blueskyPost/BlueskyPost';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import BlueskyPostSkeleton from '@/features/platforms/bluesky/components/blueskyPost/Skeleton.BlueskyPost';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import IframeEmbed from '@/features/platforms/common/components/IframeEmbed/IframeEmbed';
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
    settings.cardView !== 'compact'
  ) {
    return (
      <IframeEmbed
        url={platform.url}
        cardContent={props.cardContent}
        aspectRatio={16 / 8}
      />
    );
  }

  if (
    platform.type === SupportedPlatform.SPOTIFY &&
    settings.cardView !== 'compact'
  ) {
    return (
      <IframeEmbed
        url={platform.url}
        cardContent={props.cardContent}
        height={152}
        radius={'lg'}
      />
    );
  }

  if (
    platform.type === SupportedPlatform.PLYRFM_TRACK &&
    settings.cardView !== 'compact'
  ) {
    return (
      <IframeEmbed
        url={platform.url}
        cardContent={props.cardContent}
        height={200}
      />
    );
  }

  if (
    (platform.type === SupportedPlatform.BANDCAMP_ALBUM ||
      platform.type === SupportedPlatform.BANDCAMP_TRACK) &&
    settings.cardView !== 'compact'
  ) {
    return (
      <IframeEmbed
        url={platform.url}
        cardContent={props.cardContent}
        height={120}
        radius={0}
      />
    );
  }

  return (
    <LinkCardContent
      cardContent={props.cardContent}
      uri={props.uri}
      authorHandle={props.authorHandle}
    />
  );
}
