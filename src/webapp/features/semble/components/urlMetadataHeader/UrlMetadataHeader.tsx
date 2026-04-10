import { getUrlMetadata } from '@/features/cards/lib/dal';
import { Stack, Anchor, Title, Text, Spoiler } from '@mantine/core';

import UrlTypeBadge from '../urlTypeBadge/UrlTypeBadge';


interface Props {
  url: string;
}

export default async function UrlMetadataHeader(props: Props) {
  const { metadata } = await getUrlMetadata({ url: props.url });

  return (
    <Stack>
      <Stack gap={0} align="start">
        <UrlTypeBadge url={props.url} />
        {metadata.title && (
          <Anchor
            href={metadata.url}
            target="_blank"
            c={'inherit'}
            w={'fit-content'}
          >
            <Title order={1}>{metadata.title}</Title>
          </Anchor>
        )}
      </Stack>
      {metadata.description && (
        <Spoiler showLabel={'Read more'} hideLabel={'See less'}>
          <Text c="gray" fw={500} maw={650}>
            {metadata.description}
          </Text>
        </Spoiler>
      )}
    </Stack>
  );
}
