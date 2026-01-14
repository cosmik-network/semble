'use client';

import { CardSortField, UrlType } from '@semble/types';
import { Select, Button, Group, Popover } from '@mantine/core';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { upperFirst } from '@mantine/hooks';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { MdFilterList } from 'react-icons/md';
import { BsFillGridFill, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

export default function CardsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSetting } = useUserSettings();
  const { data: featureFlags } = useFeatureFlags();
  const [, startTransition] = useTransition();

  // sort
  const sortValue =
    (searchParams.get('sort') as CardSortField) ?? CardSortField.UPDATED_AT;

  const onSortChange = (next: CardSortField) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', next);

      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  // url type
  const [opened, setOpened] = useState(false);
  const typeFromUrl = searchParams.get('type') as UrlType | null;

  const SelectedIcon =
    typeFromUrl === null ? MdFilterList : getUrlTypeIcon(typeFromUrl);

  const handleTypeChange = (type?: UrlType) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (type) {
        params.set('type', type);
      } else {
        params.delete('type');
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    });

    setOpened(false);
  };

  return (
    <Group gap="xs" justify="space-between">
      {/* sort */}
      <Select
        allowDeselect={false}
        variant="filled"
        size="sm"
        value={sortValue}
        onChange={(v) => onSortChange(v as CardSortField)}
        data={[
          { value: CardSortField.UPDATED_AT, label: 'Newest' },
          { value: CardSortField.CREATED_AT, label: 'Oldest' },
          { value: CardSortField.LIBRARY_COUNT, label: 'Most Popular' },
        ]}
      />

      <Group gap={'xs'}>
        {/* type */}
        {featureFlags?.urlTypeFilter && (
          <Popover opened={opened} onChange={setOpened} shadow="sm">
            <Popover.Target>
              <Button
                variant="light"
                color="gray"
                leftSection={<SelectedIcon />}
                onClick={() => setOpened((o) => !o)}
              >
                {typeFromUrl ? upperFirst(typeFromUrl) : 'All Types'}
              </Button>
            </Popover.Target>

            <Popover.Dropdown maw={300}>
              <Group gap={6}>
                <Button
                  size="xs"
                  color="lime"
                  variant={typeFromUrl === null ? 'filled' : 'light'}
                  onClick={() => handleTypeChange()}
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
                      variant={typeFromUrl === type ? 'filled' : 'light'}
                      leftSection={<Icon />}
                      onClick={() => handleTypeChange(type)}
                    >
                      {upperFirst(type)}
                    </Button>
                  );
                })}
              </Group>
            </Popover.Dropdown>
          </Popover>
        )}

        {/* card view */}
        <Button
          variant="light"
          color="gray"
          leftSection={
            settings.cardView === 'grid' ? <BsFillGridFill /> : <BsListTask />
          }
          onClick={() =>
            updateSetting(
              'cardView',
              settings.cardView === 'grid' ? 'list' : 'grid',
            )
          }
        >
          {settings.cardView === 'grid' ? 'Grid' : 'List'}
        </Button>
      </Group>
    </Group>
  );
}
