'use client';

import { UrlCardView } from '@/api-client/types';
import { getDomain } from '@/lib/utils/link';
import {
  Card,
  Image,
  Text,
  Stack,
  Group,
  Anchor,
  AspectRatio,
  Skeleton,
  Tooltip,
} from '@mantine/core';
import Link from 'next/link';
import UrlCardActions from '../urlCardActions/UrlCardActions';
import { MouseEvent, MouseEventHandler, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import styles from './UrlCard.module.css';

interface Props {
  size?: 'large' | 'compact' | 'small';
  id: string;
  url: string;
  cardContent: UrlCardView['cardContent'];
  note?: UrlCardView['note'];
  collections?: UrlCardView['collections'];
  currentCollection?: UrlCardView['collections'][0];
  libraryCount: number;
  authorHandle?: string;
}

export default function UrlCard(props: Props) {
  const domain = getDomain(props.url);
  const router = useRouter();
  const onNavigateToSemblePage = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    router.push(`/url/${props.cardContent.url}`);
  };
  // TODO: add more sizes

  return (
    <Card
      component="article"
      radius={'lg'}
      p={'sm'}
      flex={1}
      h={'100%'}
      className={styles.root}
      withBorder
      onClick={onNavigateToSemblePage}
    >
      <Stack justify="space-between" gap={'sm'} flex={1}>
        <Group justify="space-between" align="start" gap={'lg'}>
          <Stack gap={0} flex={1}>
            <Tooltip label={props.url}>
              <Anchor
                component={Link}
                href={props.url}
                target="_blank"
                c={'gray'}
                lineClamp={1}
                onClick={(e) => e.stopPropagation()}
              >
                {domain}
              </Anchor>
            </Tooltip>
            {props.cardContent.title && (
              <Text fw={500} lineClamp={2}>
                {props.cardContent.title}
              </Text>
            )}
            {props.cardContent.description && (
              <Text c={'gray'} fz={'sm'} mt={'xs'} lineClamp={3}>
                {props.cardContent.description}
              </Text>
            )}
          </Stack>
          {props.cardContent.thumbnailUrl && (
            <AspectRatio ratio={1 / 1}>
              <Image
                src={props.cardContent.thumbnailUrl}
                alt={`${props.url} social preview image`}
                radius={'md'}
                w={75}
                h={75}
              />
            </AspectRatio>
          )}
        </Group>

        <Suspense
          fallback={
            <Group justify="space-between">
              <Group gap={'xs'}>
                <Skeleton w={22} h={22} />
              </Group>
              <Skeleton w={22} h={22} />
            </Group>
          }
        >
          <UrlCardActions
            cardContent={props.cardContent}
            id={props.id}
            authorHandle={props.authorHandle}
            note={props.note}
            currentCollection={props.currentCollection}
            libraryCount={props.libraryCount}
          />
        </Suspense>
      </Stack>
    </Card>
  );
}
