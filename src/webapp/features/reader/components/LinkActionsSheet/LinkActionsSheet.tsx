'use client';

import { Button, Drawer, Stack, Text } from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { TbExternalLink, TbPlugConnected } from 'react-icons/tb';
import { getDomain } from '@/lib/utils/link';
import type { ReaderLink } from '../../lib/useReaderLinks';

interface Props {
  link: ReaderLink | null;
  onClose: () => void;
  onSave: (link: ReaderLink) => void;
  onConnect: (link: ReaderLink) => void;
}

export default function LinkActionsSheet(props: Props) {
  const { link } = props;

  return (
    <Drawer
      opened={!!link}
      onClose={props.onClose}
      position="bottom"
      size="auto"
      title={
        link && (
          <Stack gap={0}>
            <Text fw={600} lineClamp={2}>
              {link.text}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {getDomain(link.href)}
            </Text>
          </Stack>
        )
      }
    >
      {link && (
        <Stack gap="xs" pb="md">
          <Button
            variant="light"
            color="gray"
            radius="xl"
            leftSection={<TbExternalLink size={16} />}
            component="a"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={props.onClose}
          >
            Open link
          </Button>
          <Button
            variant="light"
            color="gray"
            radius="xl"
            leftSection={<FiPlus size={16} />}
            onClick={() => props.onSave(link)}
          >
            Save
          </Button>
          <Button
            variant="light"
            color="gray"
            radius="xl"
            leftSection={<TbPlugConnected size={16} />}
            onClick={() => props.onConnect(link)}
          >
            Connect
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
