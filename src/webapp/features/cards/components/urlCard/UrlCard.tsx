'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Anchor, Avatar, Card, Group, Stack, Text } from '@mantine/core';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { MouseEvent } from 'react';
import UrlCardContent from '../urlCardContent/UrlCardContent';
import { useRouter } from 'next/navigation';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import styles from './UrlCard.module.css';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import UrlCardDebugView from '../UrlCardDebugView/UrlCardDebugView';
import Link from 'next/link';

interface Props {
  id: string;
  url: string;
  uri?: string;
  cardContent: UrlCard['cardContent'];
  note?: UrlCard['note'];
  currentCollection?: Collection;
  urlLibraryCount: number;
  urlIsInLibrary?: boolean;
  authorHandle?: string;
  cardAuthor?: User;
  viaCardId?: string;
  showAuthor?: boolean;
}

export default function UrlCard(props: Props) {
  const router = useRouter();
  const { settings } = useUserSettings();

  const handleNavigateToSemblePage = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    let targetUrl: string;

    if (isCollectionPage(props.url) || isProfilePage(props.url)) {
      targetUrl = props.url;
    } else {
      // Build URL with viaCardId first, then id last (since id contains a URL that might have query params)
      if (props.viaCardId) {
        targetUrl = `/url?viaCardId=${props.id}&id=${props.cardContent.url}`;
      } else {
        targetUrl = `/url?id=${props.cardContent.url}`;
      }
    }

    // Open in new tab if Cmd+Click (Mac), Ctrl+Click (Windows/Linux), or middle click
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(targetUrl);
  };

  const handleAuxClick = (e: MouseEvent<HTMLElement>) => {
    // Handle middle mouse button (button 1)
    if (e.button === 1) {
      handleNavigateToSemblePage(e);
    }
  };

  return (
    <Card
      component="article"
      radius={'lg'}
      p={'sm'}
      flex={1}
      h={'100%'}
      withBorder
      className={styles.root}
      onClick={handleNavigateToSemblePage}
      onAuxClick={handleAuxClick}
    >
      <Stack justify="space-between" flex={1}>
        <UrlCardContent
          url={props.url}
          uri={props.uri}
          cardContent={props.cardContent}
        />

        {settings.tinkerMode && (
          <UrlCardDebugView
            cardContent={props.cardContent}
            cardAuthor={props.cardAuthor}
          />
        )}

        <Stack>
          {props.showAuthor && props.cardAuthor && (
            <Group gap={'7'}>
              <Text fz={'xs'} c={'dimmed'} fw={500}>
                Added by{' '}
              </Text>
              <Group gap={'5'}>
                <Avatar
                  component={Link}
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
                  component={Link}
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
            viaCardId={props.viaCardId}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
