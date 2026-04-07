'use client';

import {
  ActionIcon,
  Anchor,
  Card,
  CloseButton,
  Group,
  Image,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { LuX } from 'react-icons/lu';
import { getDomain } from '@/lib/utils/link';
import Link from 'next/link';

function SourceCardPreviewSkeleton() {
  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Group gap="xs" wrap="nowrap">
        <Skeleton width={45} height={45} radius={'md'} />
        <Stack gap={0} style={{ flex: 1 }}>
          <Skeleton height={14} width="80%" radius="sm" />
          <Skeleton height={12} width="60%" radius="sm" mt={4} />
        </Stack>
      </Group>
    </Card>
  );
}

export default function SourceCardPreview({
  sourceUrl,
  onRemove,
}: {
  sourceUrl: string;
  onRemove?: () => void;
}) {
  const { data: sourceUrlMetadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['url metadata', sourceUrl],
    queryFn: async () => {
      const client = createSembleClient();
      return client.getUrlMetadata({ url: sourceUrl });
    },
    enabled: !!sourceUrl,
  });

  if (isLoadingMetadata) {
    return <SourceCardPreviewSkeleton />;
  }

  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Group gap="xs" wrap="nowrap">
        {sourceUrlMetadata?.metadata?.imageUrl && (
          <Image
            src={sourceUrlMetadata.metadata.imageUrl}
            alt={`${sourceUrlMetadata.metadata.title} social preview image`}
            radius={'md'}
            w={45}
            h={45}
            style={{ flexShrink: 0 }}
          />
        )}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={500} lineClamp={1} c={'bright'}>
            {sourceUrlMetadata?.metadata?.title || sourceUrl}
          </Text>
          <Tooltip label={sourceUrl}>
            <Anchor
              component={Link}
              href={sourceUrl}
              target="_blank"
              c={'gray'}
              fz={'sm'}
              lineClamp={1}
              w="fit-content"
              onClick={(e) => e.stopPropagation()}
            >
              {getDomain(sourceUrl)}
            </Anchor>
          </Tooltip>
        </Stack>
        {onRemove && (
          <CloseButton
            radius="xl"
            size="md"
            onClick={onRemove}
            aria-label="Remove URL"
          />
        )}
      </Group>
    </Card>
  );
}
