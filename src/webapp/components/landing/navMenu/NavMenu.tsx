'use client';

import { Group, Button, Scroller } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { LinkButton } from '@/components/link/MantineLink';

const IOS_SHORTCUT_HREF =
  'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6';

export default function NavMenu() {
  const os = useOs();
  const isIos = os === 'ios';

  return (
    <Scroller>
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
          <LinkButton
            href={IOS_SHORTCUT_HREF}
            target="_blank"
            variant="light"
            color="gray"
            size="xs"
          >
            iOS shortcut
          </LinkButton>
        )}
      </Group>
    </Scroller>
  );
}
