'use client';

import { ActionIcon } from '@mantine/core';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { useNavbarContext } from '@/providers/navbar';
import { NEW_CANVAS_HREF } from '../../lib/constants';

export default function NewCanvasNavButton() {
  const { toggleMobile } = useNavbarContext();

  return (
    <ActionIcon
      component={Link}
      href={NEW_CANVAS_HREF}
      prefetch={false}
      variant="subtle"
      color="gray"
      size="sm"
      radius="xl"
      aria-label="New canvas"
      onClick={toggleMobile}
    >
      <FiPlus />
    </ActionIcon>
  );
}
