'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Popover,
  Text,
  Tooltip,
} from '@mantine/core';
import { TbLink, TbX } from 'react-icons/tb';
import ReaderTextSettings, {
  type ReaderSettings,
} from '../ReaderTextSettings/ReaderTextSettings';

interface Props {
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  linkCount?: number;
  onOpenLinks: () => void;
  onClose: () => void;
}

/** The pill floating over the bottom of the reader. */
export default function ReaderToolbar(props: Props) {
  const [textSettingsOpen, setTextSettingsOpen] = useState(false);
  const linksDisabled = !props.linkCount;

  return (
    <Group
      pos="absolute"
      bottom="var(--mantine-spacing-md)"
      left={0}
      right={0}
      justify="center"
      style={{ pointerEvents: 'none', zIndex: 1 }}
    >
      <Paper
        radius="xl"
        shadow="md"
        withBorder
        p={4}
        style={{ pointerEvents: 'auto' }}
      >
        <Group gap="xl">
          <Group gap={0}>
            <Popover
              opened={textSettingsOpen}
              onChange={setTextSettingsOpen}
              position="top-start"
              radius="lg"
              shadow="md"
              width={300}
              withinPortal={false}
            >
              <Popover.Target>
                <Button
                  variant={textSettingsOpen ? 'inverse' : 'subtle'}
                  color="gray"
                  size="sm"
                  px="sm"
                  radius="xl"
                  leftSection={
                    <Text component="span" fw={700}>
                      Aa
                    </Text>
                  }
                  onClick={() => setTextSettingsOpen((open) => !open)}
                  aria-label="Text settings"
                >
                  Text
                </Button>
              </Popover.Target>
              <ReaderTextSettings
                settings={props.settings}
                onChange={props.onSettingsChange}
              />
            </Popover>

            {/* Always rendered so the bar keeps its width while the article
                loads. Mantine fills a disabled button gray, so the disabled
                style is overridden to just dim it. */}
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              px="sm"
              radius="xl"
              disabled={linksDisabled}
              style={
                linksDisabled
                  ? {
                      background: 'transparent',
                      color: 'var(--mantine-color-dimmed)',
                      cursor: 'default',
                    }
                  : undefined
              }
              leftSection={<TbLink size={16} />}
              rightSection={
                <Badge size="xs" variant="filled" color="gray" miw={18}>
                  {props.linkCount ?? ''}
                </Badge>
              }
              onClick={props.onOpenLinks}
              aria-label="View all links"
            >
              Links
            </Button>
          </Group>

          <Tooltip label="Close" withArrow position="top">
            <ActionIcon
              variant="subtle"
              color="gray"
              size={36}
              radius="xl"
              onClick={props.onClose}
              aria-label="Close reader mode"
            >
              <TbX size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>
    </Group>
  );
}
