'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Card, Stack } from '@mantine/core';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { MouseEvent } from 'react';
import UrlCardContent from '../urlCardContent/UrlCardContent';
import { useRouter } from 'next/navigation';
import { isCollectionPage } from '@/lib/utils/link';
import styles from './UrlCard.module.css';
import { CardSize } from '../../types';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import UrlCardDebugView from '../UrlCardDebugView/UrlCardDebugView';

interface Props {
  size?: CardSize;
  id: string;
  url: string;
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

    if (isCollectionPage(props.url)) {
      router.push(props.url);
      return;
    }

    router.push(`/url?id=${props.cardContent.url}`);
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
    >
      <Stack justify="space-between" gap={'sm'} flex={1}>
        <UrlCardContent
          url={props.url}
          cardContent={props.cardContent}
          cardSize={props.size}
        />

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
