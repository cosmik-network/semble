'use client';

import { getUrlTypeIcon } from '@/lib/utils/icon';
import { Button, Group, Popover } from '@mantine/core';
import { upperFirst } from '@mantine/hooks';
import { UrlType } from '@semble/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { MdFilterList } from 'react-icons/md';

export default function FeedFilters() {
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeFromUrl = searchParams.get('type') as UrlType | null;

  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    typeFromUrl,
  );

  const [, startTransition] = useTransition();

  const SelectedIcon =
    optimisticType === null ? MdFilterList : getUrlTypeIcon(optimisticType);

  const handleFilterClick = (type?: UrlType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticType(nextType);

      const params = new URLSearchParams(searchParams.toString());
      if (nextType) {
        params.set('type', nextType);
      } else {
        params.delete('type');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    });

    setOpened(false);
  };

  return (
    <Popover opened={opened} onChange={setOpened} shadow="sm">
      <Popover.Target>
        <Button
          variant="light"
          color="lime"
          leftSection={<SelectedIcon />}
          onClick={() => setOpened((o) => !o)}
        >
          {optimisticType ? upperFirst(optimisticType) : 'All Cards'}
        </Button>
      </Popover.Target>

      <Popover.Dropdown maw={300}>
        <Group gap={6}>
          <Button
            size="xs"
            color="lime"
            variant={optimisticType === null ? 'filled' : 'light'}
            onClick={() => handleFilterClick()}
          >
            All Cards
          </Button>

          {Object.values(UrlType).map((type) => {
            const Icon = getUrlTypeIcon(type);

            return (
              <Button
                key={type}
                size="xs"
                color="lime"
                variant={optimisticType === type ? 'filled' : 'light'}
                leftSection={<Icon />}
                onClick={() => handleFilterClick(type)}
              >
                {upperFirst(type)}
              </Button>
            );
          })}
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
