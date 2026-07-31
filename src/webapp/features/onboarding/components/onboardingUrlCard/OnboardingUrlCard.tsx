'use client';

import type { UrlView } from '@/api-client';
import { Card, Group, Image, Stack, Text, ThemeIcon } from '@mantine/core';
import { BsCheck, BsPlus } from 'react-icons/bs';

interface Props {
  urlView: UrlView;
  selected: boolean;
  onToggle: (url: string) => void;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function OnboardingUrlCard(props: Props) {
  const { urlView, selected } = props;
  const metadata = urlView.metadata;

  return (
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      h={'100%'}
      onClick={() => props.onToggle(urlView.url)}
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-color-green-6)' : undefined,
      }}
    >
      <Group wrap="nowrap" align="flex-start" gap={'sm'}>
        {metadata.imageUrl && (
          <Card p={0} radius={'md'} withBorder w={80} h={80} flex={'0 0 auto'}>
            <Image
              src={metadata.imageUrl}
              alt={metadata.title ?? urlView.url}
              w={'100%'}
              h={'100%'}
              fit="cover"
            />
          </Card>
        )}

        <Stack gap={4} flex={1} miw={0}>
          <Text fz={'xs'} c={'gray'} lineClamp={1}>
            {metadata.siteName || getDomain(urlView.url)}
          </Text>
          <Text fw={600} c={'bright'} lineClamp={2}>
            {metadata.title || urlView.url}
          </Text>
          {metadata.description && (
            <Text fz={'sm'} c={'gray'} lineClamp={2}>
              {metadata.description}
            </Text>
          )}
        </Stack>

        <ThemeIcon
          variant={selected ? 'filled' : 'light'}
          color={selected ? 'green' : 'gray'}
          radius={'xl'}
          size={'lg'}
        >
          {selected ? <BsCheck size={20} /> : <BsPlus size={20} />}
        </ThemeIcon>
      </Group>
    </Card>
  );
}
