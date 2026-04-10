'use client';

import {
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
import { getDomain } from '@/lib/utils/link';


function SourceCardPreviewSkeleton() {
  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Group gap="xs" wrap="nowrap">
        <Skeleton width={45} height={45} radius={'md'} />
        <Stack gap={0} style={{ flex: 1 }}>
          <Skeleton height={21.5} width="80%" radius="sm" />
          <Skeleton height={18.5} width="60%" radius="sm" mt={4} />
        </Stack>
      </Group>
    </Card>
  );
}

interface Props {
  sourceUrl: string;
  onRemove?: () => void;
}

export default function SourceCardPreview(props: Props) {
  const { data, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['url metadata', props.sourceUrl],
    queryFn: async () => {
      const client = createSembleClient();
      return client.getUrlMetadata({ url: props.sourceUrl });
    },
    enabled: !!props.sourceUrl,
  });

  if (isLoadingMetadata) {
    return <SourceCardPreviewSkeleton />;
  }

  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Group gap="xs" wrap="nowrap">
        {data?.metadata?.imageUrl && (
          <Image
            src={data.metadata.imageUrl}
            alt={`${data.metadata.title} social preview image`}
            radius={'md'}
            w={45}
            h={45}
            style={{ flexShrink: 0 }}
          />
        )}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={500} lineClamp={1} c={'bright'}>
            {data?.metadata?.title || props.sourceUrl}
          </Text>
          <Tooltip label={props.sourceUrl}>
            <Anchor
              href={props.sourceUrl}
              target="_blank"
              c={'gray'}
              fz={'sm'}
              lineClamp={1}
              w="fit-content"
              onClick={(e) => e.stopPropagation()}
            >
              {getDomain(props.sourceUrl)}
            </Anchor>
          </Tooltip>
        </Stack>
        {props.onRemove && (
          <CloseButton
            radius="xl"
            size="md"
            onClick={props.onRemove}
            aria-label="Remove URL"
          />
        )}
      </Group>
    </Card>
  );
}
