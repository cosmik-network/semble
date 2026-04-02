'use client';

import { ActionIcon } from '@mantine/core';
import { BiSolidLeftArrowAlt } from 'react-icons/bi';
import { useRouter } from 'next/navigation';
import { useNavHistory } from '@/providers/navHistory';

export default function BackButton() {
  const { canGoBack } = useNavHistory();
  const router = useRouter();

  if (!canGoBack) return null;

  return (
    <ActionIcon
      onClick={() => router.back()}
      variant="light"
      size="md"
      color="gray"
      radius={'xl'}
      aria-label="Go back"
    >
      <BiSolidLeftArrowAlt />
    </ActionIcon>
  );
}
