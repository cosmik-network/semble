'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { Card, Image, Stack, Text } from '@mantine/core';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  id: string;
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
  analyticsContext?: CardSaveAnalyticsContext;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export default function ImageCard(props: Props) {
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
        <Stack gap="xs">
          {props.cardContent.title && (
            <Text fz="sm" c="gray" lineClamp={2}>
              {props.cardContent.title}
            </Text>
          )}

          {props.cardContent.imageUrl && (
            <Image
              src={props.cardContent.imageUrl}
              alt={props.cardContent.title || 'Card image'}
              w="100%"
              mah={400}
              radius="md"
              fit="cover"
            />
          )}
        </Stack>

        <Stack gap="xs" pt={0}>
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
            analyticsContext={props.analyticsContext}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
