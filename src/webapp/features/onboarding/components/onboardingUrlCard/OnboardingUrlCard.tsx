'use client';

import type { UrlView } from '@/api-client';
import { Card, Checkbox, Group, Image, Stack, Text } from '@mantine/core';

interface Props {
  urlView: UrlView;
  selected: boolean;
  onToggle: (url: string) => void;
}

export default function OnboardingUrlCard(props: Props) {
  const metadata = props.urlView.metadata;

  return (
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      onClick={() => props.onToggle(props.urlView.url)}
      style={{ cursor: 'pointer' }}
      bd={props.selected ? '1px solid var(--mantine-color-green-6)' : undefined}
    >
      <Group gap={'sm'} wrap="nowrap" align="flex-start">
        <Checkbox
          checked={props.selected}
          onChange={() => props.onToggle(props.urlView.url)}
          // The Card's onClick also toggles. Without this, a click on the
          // checkbox bubbles to the Card and fires a second toggle, netting
          // out to no change — the labelled control would do nothing.
          onClick={(event) => event.stopPropagation()}
          // `||`, not `??`: a recommendation can come back with title: '',
          // and an empty accessible name is worse than the URL.
          aria-label={`Select ${metadata.title || props.urlView.url}`}
          mt={2}
        />

        {metadata.imageUrl && (
          <Image
            src={metadata.imageUrl}
            alt=""
            w={64}
            h={64}
            radius={'md'}
            fit="cover"
            style={{ border: '1px solid var(--mantine-color-default-border)' }}
          />
        )}

        <Stack gap={2} miw={0}>
          {/* `||`, not `??`: title: '' would otherwise render an empty
              heading instead of falling back to the URL. */}
          <Text fw={600} c={'bright'} lineClamp={2}>
            {metadata.title || props.urlView.url}
          </Text>
          {metadata.description && (
            <Text fz={'sm'} c={'dimmed'} lineClamp={2}>
              {metadata.description}
            </Text>
          )}
          <Text fz={'xs'} c={'dimmed'} lineClamp={1}>
            {props.urlView.url}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
