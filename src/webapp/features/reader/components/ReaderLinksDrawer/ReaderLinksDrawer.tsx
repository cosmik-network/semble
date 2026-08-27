'use client';

import {
  ActionIcon,
  Anchor,
  Drawer,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import { getDomain } from '@/lib/utils/link';
import type { ReaderLink } from '../../lib/useReaderLinks';

interface Props {
  opened: boolean;
  onClose: () => void;
  links: ReaderLink[];
  onSave: (link: ReaderLink) => void;
  onConnect: (link: ReaderLink) => void;
}

export default function ReaderLinksDrawer(props: Props) {
  return (
    <Drawer
      opened={props.opened}
      onClose={props.onClose}
      position="bottom"
      size="60%"
      title={
        <Text fw={600}>
          Links in this article
          {props.links.length > 0 && ` (${props.links.length})`}
        </Text>
      }
    >
      {props.links.length === 0 ? (
        <Text c="dimmed" py="md">
          No links found in this article.
        </Text>
      ) : (
        <Stack gap="sm" pb="md">
          {props.links.map((link) => (
            <Group key={link.href} justify="space-between" wrap="nowrap">
              <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                <Anchor
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  fw={500}
                  c="bright"
                  lineClamp={1}
                >
                  {link.text}
                </Anchor>
                <Text size="xs" c="dimmed" truncate>
                  {getDomain(link.href)}
                </Text>
              </Stack>
              <Group gap="xs" wrap="nowrap">
                <Tooltip label="Save" withArrow position="top">
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="lg"
                    radius="xl"
                    onClick={() => props.onSave(link)}
                    aria-label={`Save ${link.text}`}
                  >
                    <FiPlus size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Connect" withArrow position="top">
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="lg"
                    radius="xl"
                    onClick={() => props.onConnect(link)}
                    aria-label={`Connect ${link.text}`}
                  >
                    <TbPlugConnected size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Drawer>
  );
}
