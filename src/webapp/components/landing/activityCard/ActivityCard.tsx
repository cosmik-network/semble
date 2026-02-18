'use client';

import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import { Avatar, Card, Group, Stack, Text } from '@mantine/core';
import { UrlCard, User } from '@semble/types';
import { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sanitizeText } from '@/lib/utils/text';
import { getRelativeTime } from '@/lib/utils/time';

interface Props {
  id: string;
  url: string;
  uri?: string;
  cardContent: UrlCard['cardContent'];
  note?: UrlCard['note'];
  cardAuthor?: User;
  createdAt: string;
  urlLibraryCount: number;
  urlIsInLibrary?: boolean;
  authorHandle?: string;
}

export default function ActivityCard(props: Props) {
  const time = getRelativeTime(props.createdAt.toString());
  const relativeCreatedDate = time === 'just now' ? `Now` : `${time} ago`;

  const router = useRouter();

  const handleNavigateToSemblePage = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    if (isCollectionPage(props.url) || isProfilePage(props.url)) {
      router.push(props.url);
      return;
    }

    router.push(`/url?id=${props.cardContent.url}`);
  };

  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      {props.cardAuthor && (
        <Card p={0}>
          <Group
            gap={'xs'}
            wrap="nowrap"
            justify="space-between"
            align="center"
          >
            <Group gap={'xs'}>
              <Avatar
                component={Link}
                href={`/profile/${props.cardAuthor.handle}`}
                src={props.cardAuthor.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${props.cardAuthor.name}'s avatar`}
                size={'sm'}
              />
              <Text
                component={Link}
                href={`/profile/${props.cardAuthor.handle}`}
                fw={600}
                c={'bright'}
              >
                {sanitizeText(props.cardAuthor.name)}
              </Text>
            </Group>
            <Text fz={'sm'} fw={600} c={'gray'} span display={'block'}>
              {relativeCreatedDate}
            </Text>
          </Group>
        </Card>
      )}
      <Card
        component={'article'}
        radius={'lg'}
        p={'sm'}
        flex={1}
        h={'100%'}
        onClick={handleNavigateToSemblePage}
        style={{ cursor: 'pointer' }}
        withBorder
      >
        <Stack justify="space-between" gap={'sm'} flex={1}>
          <UrlCardContent
            url={props.url}
            uri={props.uri}
            cardContent={props.cardContent}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
