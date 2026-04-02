'use client';

import { ActionIcon } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useNavHistory } from '@/providers/navHistory';
import { IoArrowBack } from 'react-icons/io5';

export default function BackButton() {
  const { canGoBack } = useNavHistory();
  const router = useRouter();

  if (!canGoBack) return null;

  return (
    <ActionIcon
      onClick={() => router.back()}
      variant="light"
      size="lg"
      color="gray"
      radius={'xl'}
      aria-label="Go back"
    >
      <IoArrowBack />
    </ActionIcon>
  );
}
