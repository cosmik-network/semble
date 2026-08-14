'use client';

import { useState } from 'react';
import type { UrlView } from '@/api-client';
import { AspectRatio, Card, Group, Image, Stack, Text } from '@mantine/core';
import { getDomain } from '@/lib/utils/link';

interface Props {
  urlView: UrlView;
}

/**
 * The picker tile is itself the control, so unlike the shared UrlCardContent
 * nothing in here is allowed to be interactive: the domain is plain text, and
 * there are no platform embeds.
 */
export default function OnboardingUrlCardContent(props: Props) {
  const [imageError, setImageError] = useState(false);

  const metadata = props.urlView.metadata;

  return (
    <Group justify="space-between" align="start" gap={'lg'}>
      <Stack gap={0} flex={1}>
        <Text c={'gray'} lineClamp={1} w={'fit-content'} fz={'sm'}>
          {getDomain(props.urlView.url)}
        </Text>
        {metadata.title && (
          <Text c={'bright'} lineClamp={2} fw={500}>
            {metadata.title}
          </Text>
        )}
        {metadata.description && (
          <Text c={'gray'} fz={'sm'} mt={'xs'} lineClamp={3}>
            {metadata.description}
          </Text>
        )}
      </Stack>
      {metadata.imageUrl && !imageError && (
        <AspectRatio ratio={1 / 1}>
          <Card p={0} radius={'md'} withBorder w={75} h={75} style={{ flexShrink: 0 }}>
            <Image
              src={metadata.imageUrl}
              alt={`${props.urlView.url} social preview image`}
              w={'100%'}
              h={'100%'}
              fit="cover"
              onError={() => setImageError(true)}
            />
          </Card>
        </AspectRatio>
      )}
    </Group>
  );
}
