'use client';

import {
  Divider,
  Group,
  Popover,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@mantine/core';

export const FONT_SIZE_OPTIONS = [14, 17, 20, 24];

export interface ReaderSettings {
  fontSize: number;
  wide: boolean;
  showLinks: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 17,
  wide: false,
  showLinks: true,
};

interface Props {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
}

export default function ReaderTextSettings(props: Props) {
  const { settings } = props;

  return (
    <Popover.Dropdown p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Text size
          </Text>
          <Text size="xs" fw={600} c="dimmed">
            {settings.fontSize}px
          </Text>
        </Group>
        <SegmentedControl
          fullWidth
          value={String(settings.fontSize)}
          onChange={(value) =>
            props.onChange({ ...settings, fontSize: Number(value) })
          }
          data={FONT_SIZE_OPTIONS.map((size, index) => ({
            value: String(size),
            label: (
              <Text component="span" fw={600} fz={13 + index * 3} lh="24px">
                A
              </Text>
            ),
          }))}
        />
        <Divider />
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Line width
          </Text>
          <SegmentedControl
            size="xs"
            value={settings.wide ? 'wide' : 'cozy'}
            onChange={(value) =>
              props.onChange({ ...settings, wide: value === 'wide' })
            }
            data={[
              { value: 'cozy', label: 'Cozy' },
              { value: 'wide', label: 'Wide' },
            ]}
          />
        </Group>
        <Divider />
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Show links
          </Text>
          <Switch
            checked={settings.showLinks}
            onChange={(event) =>
              props.onChange({
                ...settings,
                showLinks: event.currentTarget.checked,
              })
            }
            aria-label="Show links"
          />
        </Group>
      </Stack>
    </Popover.Dropdown>
  );
}
