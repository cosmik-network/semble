'use client';

import { Container, Stack, Switch, Group, Card, Text } from '@mantine/core';
import { useUserSettings } from '../../lib/queries/useUserSettings';

export default function AdvancedContainer() {
  const { settings, updateSetting } = useUserSettings();

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Card bg={'var(--mantine-color-gray-light)'} radius={'lg'}>
          <Group justify="space-between">
            <Stack gap={0}>
              <Text fw={500} c={'gray'}>
                Tinker mode
              </Text>
              <Text fw={500} c={'gray'} fz={'sm'}>
                See the Matrix (data exposed as raw JSON)
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
        </Card>
      </Stack>
    </Container>
  );
}
