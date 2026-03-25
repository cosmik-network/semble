'use client';

import { Box, Group, Button, ScrollAreaAutosize } from '@mantine/core';
import { useDisclosure, useOs } from '@mantine/hooks';
import Link from 'next/link';
import { RiArrowRightUpLine } from 'react-icons/ri';

const IOS_SHORTCUT_HREF =
  'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6';

export default function NavMenu() {
  const [opened, { toggle }] = useDisclosure(false);
  const os = useOs();
  const isIos = os === 'ios';

  return (
    <ScrollAreaAutosize>
      <Group gap="xs">
        <Button
          data-tally-open="31a9Ng"
          data-tally-hide-title="1"
          data-tally-layout="modal"
          data-tally-emoji-animation="none"
          variant="light"
          color="gray"
          size="xs"
        >
          Stay in the loop
        </Button>

        {isIos && (
          <Button
            component={Link}
            href={IOS_SHORTCUT_HREF}
            target="_blank"
            variant="light"
            color="gray"
            size="xs"
          >
            iOS shortcut
          </Button>
        )}
      </Group>
    </ScrollAreaAutosize>
  );
}
