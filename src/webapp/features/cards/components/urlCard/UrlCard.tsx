'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Anchor, Card, Group, Stack, Text } from '@mantine/core';
import { BsPinFill } from 'react-icons/bs';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { Suspense } from 'react';
import UrlCardContent from '../urlCardContent/UrlCardContent';
import Link from 'next/link';
import {
  getSembleHref,
  isCollectionPage,
  isProfilePage,
} from '@/lib/utils/link';
import styles from './UrlCard.module.css';
import { useSettings } from '@/providers/settings';
import UrlCardDebugView from '../UrlCardDebugView/UrlCardDebugView';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import UrlCardContentSkeleton from '../urlCardContent/Skeleton.UrlCardContent';
import { LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  id: string;
  url: string;
  uri?: string;
  cardContent: UrlCard['cardContent'];
  note?: UrlCard['note'];
  currentCollection?: Collection;
  urlLibraryCount: number;
  urlIsInLibrary?: boolean;
  urlConnectionCount: number;
  urlIsConnected?: boolean;
  authorHandle?: string;
  cardAuthor?: User;
  viaCardId?: string;
  showAuthor?: boolean;
  semblePageUrl?: string;
  analyticsContext?: CardSaveAnalyticsContext;
  isPinnedInCollection?: boolean;
  onTogglePinInCollection?: () => void;
  connectTooltipOpen?: boolean;
  saveTooltipOpen?: boolean;
  modalZIndex?: number;
}

export default function UrlCard(props: Props) {
  const { settings } = useSettings();

  const isInternalPage =
    isCollectionPage(props.url) || isProfilePage(props.url);
  const href = isInternalPage
    ? props.url
    : getSembleHref(props.cardContent.url, {
        viaCardId: props.viaCardId ? props.id : undefined,
      });

  const trackClick = () => {
    if (isInternalPage || !props.analyticsContext || !shouldCaptureAnalytics())
      return;

    // Super properties feed the card_saved event fired later on the semble page.
    posthog.register({
      original_save_source: props.analyticsContext.saveSource,
      original_active_filters: props.analyticsContext.activeFilters,
    });
    posthog.capture('card_clicked', {
      card_id: props.id,
      url: props.cardContent.url,
      save_source: props.analyticsContext.saveSource,
      active_filters: props.analyticsContext.activeFilters,
      via_card_id: props.viaCardId,
    });
  };

  return (
    <Card
      component="article"
      radius={settings.cardView === 'list' ? 0 : 'lg'}
      p={settings.cardView === 'list' ? 'xs' : 'sm'}
      flex={1}
      h={'100%'}
      withBorder={settings.cardView !== 'list'}
      className={styles.root}
    >
      <Link
        href={href}
        className={styles.link}
        onClick={trackClick}
        aria-label={props.cardContent.title ?? props.cardContent.url}
      />
      <Stack
        justify="space-between"
        flex={1}
        gap={settings.cardView === 'list' ? 'xs' : 'md'}
      >
        {props.isPinnedInCollection && (
          <Group gap={5} c="dimmed">
            <BsPinFill size={12} />
            <Text fz="xs" fw={500}>
              Pinned
            </Text>
          </Group>
        )}
        <Suspense fallback={<UrlCardContentSkeleton />}>
          <UrlCardContent
            url={props.url}
            uri={props.uri}
            cardContent={props.cardContent}
          />
        </Suspense>

        {settings.tinkerMode && (
          <UrlCardDebugView
            cardContent={props.cardContent}
            cardAuthor={props.cardAuthor}
          />
        )}

        <Stack gap={settings.cardView === 'list' ? 'xs' : 'md'}>
          {props.showAuthor && props.cardAuthor && (
            <Group gap={'7'}>
              <Text fz={'xs'} c={'dimmed'} fw={500}>
                By{' '}
              </Text>
              <Group gap={'5'}>
                <LinkAvatar
                  href={`/profile/${props.cardAuthor?.handle}`}
                  src={props.cardAuthor?.avatarUrl?.replace(
                    'avatar',
                    'avatar_thumbnail',
                  )}
                  alt={`${props.cardAuthor?.handle}'s avatar`}
                  size={'xs'}
                  radius={'sm'}
                />
                <Anchor
                  href={`/profile/${props.cardAuthor.handle}`}
                  fz={'xs'}
                  fw={600}
                  c={'bright'}
                  underline="never"
                  onClick={(e) => e.stopPropagation()}
                >
                  {props.cardAuthor.name || `@${props.cardAuthor.handle}`}
                </Anchor>
              </Group>
            </Group>
          )}

          <UrlCardActions
            cardAuthor={props.cardAuthor}
            cardContent={props.cardContent}
            cardCount={props.urlLibraryCount}
            id={props.id}
            authorHandle={props.authorHandle}
            note={props.note}
            currentCollection={props.currentCollection}
            urlLibraryCount={props.urlLibraryCount}
            urlIsInLibrary={props.urlIsInLibrary ?? false}
            urlConnectionCount={props.urlConnectionCount}
            urlIsConnected={props.urlIsConnected}
            viaCardId={props.viaCardId}
            semblePageUrl={props.semblePageUrl}
            analyticsContext={props.analyticsContext}
            isPinnedInCollection={props.isPinnedInCollection}
            onTogglePinInCollection={props.onTogglePinInCollection}
            connectTooltipOpen={props.connectTooltipOpen}
            saveTooltipOpen={props.saveTooltipOpen}
            modalZIndex={props.modalZIndex}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
