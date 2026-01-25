'use client';

import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import { Card, Stack } from '@mantine/core';
import { UrlCard, User } from '@semble/types';
import { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  url: string;
  cardContent: UrlCard['cardContent'];
  note?: UrlCard['note'];
  cardAuthor?: User;
  urlLibraryCount: number;
  urlIsInLibrary?: boolean;
  authorHandle?: string;
}

export default function ActivityCard(props: Props) {
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
    <Card
      component={'article'}
      radius={'lg'}
      p={'sm'}
      flex={1}
      h={'100%'}
      onClick={handleNavigateToSemblePage}
      withBorder
    >
      <Stack justify="space-between" gap={'sm'} flex={1}>
        <UrlCardContent url={props.url} cardContent={props.cardContent} />
      </Stack>
    </Card>
  );
}
