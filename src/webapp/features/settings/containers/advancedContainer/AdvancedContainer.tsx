'use client';

import {
  Container,
  Stack,
  Switch,
  Group,
  Card,
  Text,
  Image,
  AspectRatio,
  Anchor,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import { useUserSettings } from '../../lib/queries/useUserSettings';

const MOCK_CARD_CONTENT = {
  url: 'https://example.com/understanding-atproto',
  title: 'Understanding the AT Protocol',
  description:
    'A deep dive into the architecture behind decentralized social networking.',
  author: 'Alex Johnson',
  siteName: 'example.com',
  imageUrl: 'https://picsum.photos/seed/atproto/300/300',
  type: 'article',
  retrievedAt: '2025-01-15T10:30:00Z',
};

const MOCK_CARD_AUTHOR = {
  did: 'did:plc:abc123xyz',
  handle: 'alex.example.com',
  name: 'Alex Johnson',
  avatarUrl: 'https://picsum.photos/seed/avatar/100/100',
};

function MockCardPreview() {
  return (
    <Group justify="space-between" align="start" gap="lg">
      <Stack gap={0} flex={1}>
        <Anchor
          href={MOCK_CARD_CONTENT.url}
          target="_blank"
          c="gray"
          fz="sm"
          onClick={(e) => e.preventDefault()}
          style={{ cursor: 'default' }}
        >
          {MOCK_CARD_CONTENT.siteName}
        </Anchor>
        <Text c="bright" lineClamp={2} fw={500}>
          {MOCK_CARD_CONTENT.title}
        </Text>
        <Text c="gray" fz="sm" mt="xs" lineClamp={3}>
          {MOCK_CARD_CONTENT.description}
        </Text>
      </Stack>
      <AspectRatio ratio={1 / 1}>
        <Image
          src={MOCK_CARD_CONTENT.imageUrl}
          alt="Mock card preview"
          radius="md"
          w={60}
          h={60}
        />
      </AspectRatio>
    </Group>
  );
}

export default function AdvancedContainer() {
  const { settings, updateSetting } = useUserSettings();

  return (
    <Container p="xs" size="xs">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={4}>
            <Text fw={500}>Tinker mode</Text>

            <Text fw={500} c={'gray'} fz={'sm'}>
              Reveals raw data structures throughout the app — feed items,
              cards, and collections expand to show the underlying AT Protocol
              records.
            </Text>
          </Stack>
          <Switch
            size="md"
            onLabel="ON"
            offLabel="OFF"
            withThumbIndicator={false}
            checked={settings.tinkerMode}
            onChange={(event) =>
              updateSetting('tinkerMode', event.currentTarget.checked)
            }
          />
        </Group>

        <Card bg={'var(--mantine-color-gray-light)'} radius={'lg'} p="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Stack gap="xs">
              <Badge
                variant={!settings.tinkerMode ? 'filled' : 'light'}
                color={!settings.tinkerMode ? undefined : 'gray'}
                size="sm"
                w="fit-content"
              >
                Off
              </Badge>
              <Card
                radius="md"
                withBorder
                p="sm"
                opacity={settings.tinkerMode ? 0.5 : 1}
                style={{
                  transition: 'opacity 200ms ease',
                  outline: !settings.tinkerMode
                    ? '2px solid var(--mantine-primary-color-filled)'
                    : undefined,
                }}
              >
                <MockCardPreview />
              </Card>
            </Stack>

            <Stack gap="xs">
              <Badge
                variant={settings.tinkerMode ? 'filled' : 'light'}
                color={settings.tinkerMode ? undefined : 'gray'}
                size="sm"
                w="fit-content"
              >
                On
              </Badge>
              <Card
                radius="md"
                withBorder
                p="sm"
                opacity={settings.tinkerMode ? 1 : 0.5}
                style={{
                  transition: 'opacity 200ms ease',
                  outline: settings.tinkerMode
                    ? '2px solid var(--mantine-primary-color-filled)'
                    : undefined,
                }}
              >
                <Stack gap="sm">
                  <MockCardPreview />
                  <CodeHighlightTabs
                    code={[
                      {
                        fileName: 'Content',
                        code: JSON.stringify(MOCK_CARD_CONTENT, null, 2),
                        language: 'json',
                      },
                      {
                        fileName: 'Author',
                        code: JSON.stringify(MOCK_CARD_AUTHOR, null, 2),
                        language: 'json',
                      },
                    ]}
                    radius="md"
                    withBorder
                    style={{ cursor: 'auto', zIndex: 0 }}
                    defaultExpanded={false}
                  />
                </Stack>
              </Card>
            </Stack>
          </SimpleGrid>
        </Card>
      </Stack>
    </Container>
  );
}
