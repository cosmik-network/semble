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
        p={'xs'}
        style={{ pointerEvents: 'auto' }}
      >
        <Group gap="xl">
          <Group gap={'xs'}>
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
                  variant="light"
                  color="gray"
                  size="sm"
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
              variant="light"
              color="gray"
              size="sm"
              radius="xl"
              disabled={linksDisabled}
              leftSection={<TbLink size={16} />}
              rightSection={
                <Badge size="xs" variant="filled" color="gray" miw={20}>
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
              variant="light"
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
