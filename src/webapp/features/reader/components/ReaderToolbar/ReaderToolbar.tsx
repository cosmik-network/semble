'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
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
  const linksLoading = props.linkCount === undefined;
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
                <Tooltip
                  label="Text settings"
                  withArrow
                  position="top"
                  disabled={textSettingsOpen}
                >
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
                </Tooltip>
              </Popover.Target>
              <ReaderTextSettings
                settings={props.settings}
                onChange={props.onSettingsChange}
              />
            </Popover>

            <Tooltip
              label={
                props.linkCount === 0
                  ? 'No links found in this article'
                  : 'View all links'
              }
              withArrow
              position="top"
              disabled={linksLoading}
            >
              <Button
                variant="light"
                color="gray"
                size="sm"
                radius="xl"
                data-disabled={linksDisabled}
                leftSection={<TbLink size={16} />}
                rightSection={
                  linksLoading ? (
                    <Loader size={12} color="gray" />
                  ) : (
                    <Badge size="xs" variant="filled" color="gray" miw={20}>
                      {props.linkCount}
                    </Badge>
                  )
                }
                onClick={() => {
                  if (!linksDisabled) props.onOpenLinks();
                }}
                aria-label="View all links"
              >
                Links
              </Button>
            </Tooltip>
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
