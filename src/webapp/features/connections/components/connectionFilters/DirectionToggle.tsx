'use client';

import { SegmentedControl } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

type Direction = 'outgoing' | 'incoming';

export default function DirectionToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const directionFromUrl =
    (searchParams.get('direction') as Direction) ?? 'outgoing';

  const [optimisticDirection, setOptimisticDirection] =
    useOptimistic<Direction>(directionFromUrl);

  const onChange = (value: string) => {
    const direction = value as Direction;
    startTransition(() => {
      setOptimisticDirection(direction);

      const params = new URLSearchParams(searchParams.toString());
      params.set('direction', direction);

      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <SegmentedControl
      value={optimisticDirection}
      onChange={onChange}
      data={[
        { label: 'Outgoing', value: 'outgoing' },
        { label: 'Incoming', value: 'incoming' },
      ]}
    />
  );
}
