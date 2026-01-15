'use client';

import { UrlType } from '@semble/types';
import { Button, Group, Popover } from '@mantine/core';
import { useState, useOptimistic, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { upperFirst } from '@mantine/hooks';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { MdFilterList } from 'react-icons/md';

export default function CardTypeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const typeFromUrl = searchParams.get('type') as UrlType | null;

  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    typeFromUrl,
  );

  const [opened, setOpened] = useState(false);

  const onChange = (type?: UrlType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticType(nextType);

      const params = new URLSearchParams(searchParams.toString());
      if (nextType) {
        params.set('type', nextType);
      } else {
        params.delete('type');
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    });

    setOpened(false);
  };

  const SelectedIcon =
    optimisticType === null ? MdFilterList : getUrlTypeIcon(optimisticType);

  return (
    <Popover opened={opened} onChange={setOpened} shadow="sm">
      <Popover.Target>
        <Button
          variant="light"
          color="gray"
          leftSection={<SelectedIcon />}
          onClick={() => setOpened((o) => !o)}
        >
          {optimisticType ? upperFirst(optimisticType) : 'All Types'}
        </Button>
      </Popover.Target>

      <Popover.Dropdown maw={300}>
        <Group gap={6}>
          <Button
            size="xs"
            color="lime"
            variant={optimisticType === null ? 'filled' : 'light'}
            onClick={() => onChange()}
          >
            All Types
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
                onClick={() => onChange(type)}
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
