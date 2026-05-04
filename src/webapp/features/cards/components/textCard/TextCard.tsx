'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Card, Spoiler, Stack, Typography } from '@mantine/core';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  id: string;
  text: string;
  cardContent: UrlCard['cardContent'];
  currentCollection?: Collection;
  urlLibraryCount: number;
  urlIsInLibrary?: boolean;
  urlConnectionCount: number;
  urlIsConnected?: boolean;
  authorHandle?: string;
  cardAuthor?: User;
  viaCardId?: string;
  analyticsContext?: CardSaveAnalyticsContext;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export default function TextCard(props: Props) {
  return (
    <Card
      component="article"
      radius="lg"
      p="sm"
      flex={1}
      h="100%"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={props.onClick}
    >
      <Stack gap="xs" justify="space-between" flex={1}>
        <Spoiler showLabel={'Read more'} hideLabel={'See less'} maxHeight={200}>
          <Typography>
            <div dangerouslySetInnerHTML={{ __html: props.text }} />
          </Typography>
        </Spoiler>

        <Stack gap="xs" pt={0}>
          <UrlCardActions
            cardAuthor={props.cardAuthor}
            cardContent={props.cardContent}
            cardCount={props.urlLibraryCount}
            id={props.id}
            authorHandle={props.authorHandle}
            currentCollection={props.currentCollection}
            urlLibraryCount={props.urlLibraryCount}
            urlIsInLibrary={props.urlIsInLibrary ?? false}
            urlConnectionCount={props.urlConnectionCount}
            urlIsConnected={props.urlIsConnected}
            viaCardId={props.viaCardId}
            analyticsContext={props.analyticsContext}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
