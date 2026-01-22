'use client';

import Link from 'next/link';
import { Button } from '@mantine/core';
import { useOs } from '@mantine/hooks';

export default function IosShortcutButton() {
  const os = useOs();

  if (os !== 'ios') return null;

  return (
    <Button
      component={Link}
      href={'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6'}
      target="_blank"
      variant="light"
      color="grape"
    >
      iOS shortcut
    </Button>
  );
}
