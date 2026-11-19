'use client';

import {
  Container,
  Group,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useSettings } from '@/providers/settings';
import {
  EMBED_SOURCES,
  EmbedSource,
} from '@/features/platforms/common/lib/externalEmbeds';

export default function ExternalMediaSettingsContainer() {
  const { settings, updateSetting, isHydrated } = useSettings();

  const toggle = (source: EmbedSource) => {
    updateSetting('externalEmbeds', {
      ...settings.externalEmbeds,
      [source]: !settings.externalEmbeds[source],
    });
  };

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Stack gap={4}>
          <Text fw={500}>Allowed sources</Text>
          <Text fw={500} c={'gray'} fz={'sm'}>
            Some cards can play media from other sites. Those sites may track
            you and anything you do in the player. Allowed sources load right
            away; the rest show a preview and ask first
          </Text>
        </Stack>

        {/* Hidden until storage is read, so allowed switches don't animate on from the defaults. */}
        <Stack
          gap="md"
          style={{ visibility: isHydrated ? undefined : 'hidden' }}
        >
          {(
            Object.entries(EMBED_SOURCES) as [
              EmbedSource,
              (typeof EMBED_SOURCES)[EmbedSource],
            ][]
          ).map(([source, { label, icon: Icon }]) => (
            <Switch
              key={source}
              size="md"
              labelPosition="left"
              checked={!!settings.externalEmbeds[source]}
              onChange={() => toggle(source)}
              styles={{
                body: { justifyContent: 'space-between', alignItems: 'center' },
                labelWrapper: { flex: 1, minWidth: 0 },
                label: { cursor: 'pointer' },
              }}
              label={
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon
                    variant="light"
                    color="gray"
                    size={'lg'}
                    radius={'xl'}
                    style={{ flexShrink: 0 }}
                  >
                    <Icon size={16} />
                  </ThemeIcon>
                  <Text>{label}</Text>
                </Group>
              }
            />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
