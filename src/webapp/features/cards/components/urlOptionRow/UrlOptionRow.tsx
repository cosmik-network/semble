import { Card, Group, Image, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { getDomain } from '@/lib/utils/link';

interface Props {
  url: string;
  title?: string;
  imageUrl?: string;
}

// A link as one row of a search or picker list
export default function UrlOptionRow(props: Props) {
  // Remember which src failed, so a new imageUrl gets its own try
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!props.imageUrl && failedSrc !== props.imageUrl;

  return (
    <Group gap={'xs'} align="center" wrap="nowrap">
      {showImage && (
        <Card
          p={0}
          radius="md"
          withBorder
          w={35}
          h={35}
          style={{ flexShrink: 0 }}
        >
          <Image
            src={props.imageUrl}
            alt={props.title || 'URL thumbnail'}
            w={'100%'}
            h={'100%'}
            fit="cover"
            onError={() => setFailedSrc(props.imageUrl ?? null)}
          />
        </Card>
      )}
      <Stack gap={0}>
        <Text fw={500} c={'bright'} lineClamp={1} size="sm">
          {props.title || props.url}
        </Text>
        <Text c={'gray'} lineClamp={1} size="xs">
          {getDomain(props.url)}
        </Text>
      </Stack>
    </Group>
  );
}
