'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Card, Stack } from '@mantine/core';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { MouseEvent } from 'react';
import UrlCardContent from '../urlCardContent/UrlCardContent';
import { useRouter } from 'next/navigation';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import styles from './UrlCard.module.css';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import UrlCardDebugView from '../UrlCardDebugView/UrlCardDebugView';

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
}

export default function UrlCard(props: Props) {
  const router = useRouter();
  const { settings } = useUserSettings();

  const handleNavigateToSemblePage = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    const targetUrl =
      isCollectionPage(props.url) || isProfilePage(props.url)
        ? props.url
        : `/url?id=${props.cardContent.url}`;

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
      <Stack justify="space-between" gap={'sm'} flex={1}>
        <UrlCardContent url={props.url} uri={props.uri} cardContent={props.cardContent} />

        {settings.tinkerMode && (
          <UrlCardDebugView
            cardContent={props.cardContent}
            cardAuthor={props.cardAuthor}
          />
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
    </Card>
  );
}
