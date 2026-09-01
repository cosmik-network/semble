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

interface Props {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  wide: boolean;
  onWideChange: (wide: boolean) => void;
  showLinks: boolean;
  onShowLinksChange: (show: boolean) => void;
}

export default function ReaderTextSettings(props: Props) {
  return (
    <Popover.Dropdown p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Text size
          </Text>
          <Text size="xs" fw={600} c="dimmed">
            {props.fontSize}px
          </Text>
        </Group>
        <SegmentedControl
          fullWidth
          value={String(props.fontSize)}
          onChange={(value) => props.onFontSizeChange(Number(value))}
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
            value={props.wide ? 'wide' : 'cozy'}
            onChange={(value) => props.onWideChange(value === 'wide')}
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
            checked={props.showLinks}
            onChange={(event) =>
              props.onShowLinksChange(event.currentTarget.checked)
            }
            aria-label="Show links"
          />
        </Group>
      </Stack>
    </Popover.Dropdown>
  );
}
