'use client';

import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { getDomain } from '@/lib/utils/link';
import {
  Anchor,
  Group,
  Stack,
  Text,
  Tooltip,
  AspectRatio,
  Image,
} from '@mantine/core';
import { UrlCard } from '@semble/types';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  cardContent: UrlCard['cardContent'];
}

export default function LinkCardContent(props: Props) {
  const domain = getDomain(props.cardContent.url);
  const [imageError, setImageError] = useState(false);
  const { settings } = useUserSettings();

  return (
    <Group justify="space-between" align="start" gap={'lg'}>
      <Stack gap={0} flex={1}>
        <Tooltip label={props.cardContent.url}>
          <Anchor
            onClick={(e) => e.stopPropagation()}
            component={Link}
            href={props.cardContent.url}
            target="_blank"
            c={'gray'}
            lineClamp={1}
            w={'fit-content'}
            fz={'sm'}
          >
            {domain}
          </Anchor>
        </Tooltip>
        {props.cardContent.title && (
          <Anchor
            onClick={(e) => e.stopPropagation()}
            component={Link}
            href={props.cardContent.url}
            target="_blank"
            c={'bright'}
            lineClamp={2}
            fw={500}
            w={'fit-content'}
          >
            {props.cardContent.title}
          </Anchor>
        )}
        {props.cardContent.description && settings.cardView !== 'list' && (
          <Text c={'gray'} fz={'sm'} mt={'xs'} lineClamp={3}>
            {props.cardContent.description}
          </Text>
        )}
      </Stack>
      {props.cardContent.thumbnailUrl && !imageError && (
        <AspectRatio ratio={1 / 1}>
          <Image
            src={props.cardContent.thumbnailUrl}
            alt={`${props.cardContent.url} social preview image`}
            radius={'md'}
            w={settings.cardView === 'list' ? 45 : 75}
            h={settings.cardView === 'list' ? 45 : 75}
            onError={() => setImageError(true)}
          />
        </AspectRatio>
      )}
    </Group>
  );
}
