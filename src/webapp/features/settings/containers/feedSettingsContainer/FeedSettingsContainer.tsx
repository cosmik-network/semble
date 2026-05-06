'use client';

import {
  Container,
  Stack,
  SegmentedControl,
  Center,
  Text,
  Checkbox,
  Group,
  Button,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import { RiRobot2Fill } from 'react-icons/ri';
import { upperFirst } from '@mantine/hooks';
import { ActivitySource, ActivityType, UrlType } from '@semble/types';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import {
  activityTypeOptions,
  feedOptions,
  FeedView,
  sourceOptions,
} from '@/features/feeds/lib/feedOptions';
import { getUrlTypeIcon } from '@/lib/utils/icon';

const SOURCE_ALL: string = 'all';
const ACTIVITY_TYPE_ALL: string = 'all';

export default function FeedSettingsContainer() {
  const { settings, updateSetting } = useUserSettings();

  const isMarginSource = settings.feedSource === ActivitySource.MARGIN;

  const isAtDefaults =
    settings.feedSource === null &&
    settings.feedView === 'global' &&
    settings.feedActivityType === null &&
    settings.feedUrlType === null &&
    settings.includeKnownBots === false;

  const handleReset = () => {
    updateSetting('feedSource', null);
    updateSetting('feedView', 'global');
    updateSetting('feedActivityType', null);
    updateSetting('feedUrlType', null);
    updateSetting('includeKnownBots', false);
  };

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Stack gap="xs">
          <Stack gap={4}>
            <Text fw={500}>Source</Text>
            <Text fw={500} c={'gray'} fz={'sm'}>
              Where activity comes from. Semble can show data from other AT
              Protocol apps that use compatible lexicons
            </Text>
          </Stack>

          <SegmentedControl
            radius={'lg'}
            value={settings.feedSource ?? SOURCE_ALL}
            onChange={(value) => {
              const nextSource =
                value === SOURCE_ALL ? null : (value as ActivitySource);
              updateSetting('feedSource', nextSource);
              if (nextSource === ActivitySource.MARGIN) {
                if (settings.feedView === 'following') {
                  updateSetting('feedView', 'global');
                }
                if (settings.feedActivityType !== null) {
                  updateSetting('feedActivityType', null);
                }
              }
            }}
            size="md"
            data={sourceOptions.map((option) => ({
              value: option.value ?? SOURCE_ALL,
              label: (
                <Center style={{ gap: 10 }}>
                  {option.icon}
                  <span>{option.label}</span>
                </Center>
              ),
            }))}
          />
        </Stack>

        <Stack gap="xs">
          <Stack gap={4}>
            <Text fw={500}>Feed</Text>
            <Text fw={500} c={'gray'} fz={'sm'}>
              Global shows activity from all accounts, while following only
              shows people you follow
            </Text>
          </Stack>
          <SegmentedControl
            value={settings.feedView}
            onChange={(value) => updateSetting('feedView', value as FeedView)}
            disabled={isMarginSource}
            size="md"
            data={feedOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </Stack>

        <Stack gap="xs">
          <Stack gap={4}>
            <Text fw={500}>Activity Type</Text>
            <Text fw={500} c={'gray'} fz={'sm'}>
              Show all activity, or narrow to just new cards or connections
            </Text>
          </Stack>
          <SegmentedControl
            value={settings.feedActivityType ?? ACTIVITY_TYPE_ALL}
            onChange={(value) =>
              updateSetting(
                'feedActivityType',
                value === ACTIVITY_TYPE_ALL ? null : (value as ActivityType),
              )
            }
            disabled={isMarginSource}
            size="md"
            data={[
              { value: ACTIVITY_TYPE_ALL, label: 'All' },
              ...activityTypeOptions.map((option) => ({
                value: option.value,
                label: (
                  <Center style={{ gap: 10 }}>
                    {option.icon}
                    <span>{option.label}</span>
                  </Center>
                ),
              })),
            ]}
          />
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Stack gap={4}>
            <Text fw={500}>Card Type</Text>
            <Text fw={500} c={'gray'} fz={'sm'}>
              Filter cards by content type
            </Text>
          </Stack>

          <Group gap={6}>
            <Button
              color={settings.feedUrlType === null ? 'lime' : 'gray'}
              variant={settings.feedUrlType === null ? 'filled' : 'light'}
              onClick={() => updateSetting('feedUrlType', null)}
            >
              All
            </Button>
            {Object.values(UrlType).map((type) => {
              const Icon = getUrlTypeIcon(type);
              return (
                <Button
                  key={type}
                  color={settings.feedUrlType === type ? 'lime' : 'gray'}
                  variant={settings.feedUrlType === type ? 'filled' : 'light'}
                  leftSection={<Icon />}
                  onClick={() => updateSetting('feedUrlType', type)}
                >
                  {upperFirst(type)}
                </Button>
              );
            })}
          </Group>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={500}>Account</Text>

          <Checkbox.Card
            withBorder={false}
            radius="md"
            p="0"
            checked={settings.includeKnownBots}
            onClick={() =>
              updateSetting('includeKnownBots', !settings.includeKnownBots)
            }
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon
                  variant="light"
                  color="gray"
                  size={'lg'}
                  radius={'xl'}
                >
                  <RiRobot2Fill size={16} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text>Include bots</Text>
                  <Text c={'dimmed'} fz={'sm'}>
                    Show activity from accounts marked as bots
                  </Text>
                </Stack>
              </Group>
              <Checkbox.Indicator />
            </Group>
          </Checkbox.Card>
        </Stack>

        {!isAtDefaults && (
          <Group justify="flex-end">
            <Button variant="light" color="red" fullWidth onClick={handleReset}>
              Clear filters
            </Button>
          </Group>
        )}
      </Stack>
    </Container>
  );
}
