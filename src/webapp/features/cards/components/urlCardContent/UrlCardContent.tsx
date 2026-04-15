'use client';

import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { UrlCard } from '@semble/types';
import SembleCollectionCardContent from './SembleCollectionCardContent';
import SembleProfileCardContent from './SembleProfileCardContent';
import LinkCardContent from './LinkCardContent';
import BlueskyPost from '@/features/platforms/bluesky/components/blueskyPost/BlueskyPost';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Stack, Text, Group, Alert, Anchor, Tooltip } from '@mantine/core';
import BlueskyPlatformIcon from '@/features/platforms/bluesky/components/blueskyPlatformIcon/BlueskyPlatformIcon';
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

  if (platform.type === SupportedPlatform.SEMBLE_PROFILE) {
    if (!platform.handle) {
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
          <SembleProfileCardContent handle={platform.handle} />
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
        fallbackRender={({ error }) => {
          if (error?.status === 404 || error?.error === 'NotFound') {
            const platformName =
              platform.type === SupportedPlatform.BLUESKY_POST
                ? 'Bluesky'
                : 'Blacksky';
            return (
              <Stack justify="space-between" gap="xs">
                <Group gap="xs" justify="flex-end" wrap="nowrap" w="100%">
                  <Tooltip label={`View on ${platformName}`}>
                    <Anchor
                      href={props.url}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BlueskyPlatformIcon platform={platform.type} />
                    </Anchor>
                  </Tooltip>
                </Group>
                <Alert
                  component={'button'}
                  variant="light"
                  color="gray"
                  p={'sm'}
                  title="Post not found"
                  style={{ cursor: 'pointer' }}
                />
              </Stack>
            );
          }

          return (
            <LinkCardContent
              cardContent={props.cardContent}
              uri={props.uri}
              authorHandle={props.authorHandle}
            />
          );
        }}
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
    settings.cardView === 'grid'
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
    settings.cardView === 'grid'
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
    (platform.type === SupportedPlatform.SOUNDCLOUD_TRACK ||
      platform.type === SupportedPlatform.SOUNDCLOUD_SET) &&
    settings.cardView === 'grid'
  ) {
    return (
      <IframeEmbed
        url={platform.url}
        cardContent={props.cardContent}
        height={
          platform.type === SupportedPlatform.SOUNDCLOUD_TRACK ? 166 : 280
        }
        radius={'xs'}
      />
    );
  }

  if (
    platform.type === SupportedPlatform.PLYRFM_TRACK &&
    settings.cardView === 'grid'
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
    settings.cardView === 'grid'
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
