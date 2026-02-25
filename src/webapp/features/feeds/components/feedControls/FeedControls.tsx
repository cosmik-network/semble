'use client';

import {
  ScrollAreaAutosize,
  Combobox,
  useCombobox,
  Button,
  Group,
} from '@mantine/core';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FeedFilters from '../feedFilters/FeedFilters';
import { ActivitySource } from '@semble/types';
import { useOptimistic, useTransition } from 'react';
import { FaSeedling } from 'react-icons/fa6';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

const sourceOptions = [
  { value: null, label: 'All' },
  { value: ActivitySource.SEMBLE, label: 'Semble' },
  { value: ActivitySource.MARGIN, label: 'Margin' },
];

const feedOptions = [
  { value: 'global', label: 'Global' },
  { value: 'following', label: 'Following' },
];

export default function FeedControls() {
  const { data: featureFlags } = useFeatureFlags();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceFromUrl = searchParams.get('source') as ActivitySource | null;
  const feedFromUrl =
    (searchParams.get('feed') as 'global' | 'following') || 'global';

  const [optimisticSource, setOptimisticSource] =
    useOptimistic<ActivitySource | null>(sourceFromUrl);
  const [optimisticFeed, setOptimisticFeed] = useOptimistic<
    'global' | 'following'
  >(feedFromUrl);

  const [, startTransition] = useTransition();

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const sourceCombobox = useCombobox({
    onDropdownClose: () => sourceCombobox.resetSelectedOption(),
  });

  const feedCombobox = useCombobox({
    onDropdownClose: () => feedCombobox.resetSelectedOption(),
  });

  const selectedSource =
    sourceOptions.find((o) => o.value === optimisticSource) || sourceOptions[0];
  const selectedFeed =
    feedOptions.find((o) => o.value === optimisticFeed) || feedOptions[0];

  const handleSourceClick = (source: ActivitySource | null) => {
    startTransition(() => {
      setOptimisticSource(source);

      const params = new URLSearchParams(searchParams.toString());
      if (source) {
        params.set('source', source);
      } else {
        params.delete('source');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    });

    sourceCombobox.closeDropdown();
  };

  const handleFeedClick = (feed: 'global' | 'following') => {
    startTransition(() => {
      setOptimisticFeed(feed);

      const params = new URLSearchParams(searchParams.toString());
      params.set('feed', feed);

      router.push(`?${params.toString()}`, { scroll: false });
    });

    feedCombobox.closeDropdown();
  };

  return (
    <ScrollAreaAutosize type="scroll" offsetScrollbars={true}>
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <Group gap={'xs'} wrap="nowrap">
          <Combobox
            store={sourceCombobox}
            onOptionSubmit={(value) => {
              const option = sourceOptions.find(
                (o) => String(o.value) === value,
              );
              if (option) {
                handleSourceClick(option.value);
              }
            }}
            width={150}
          >
            <Combobox.Target>
              <Button
                variant="light"
                color="cyan"
                leftSection={<Combobox.Chevron />}
                onClick={() => sourceCombobox.toggleDropdown()}
              >
                {selectedSource?.label}
              </Button>
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {sourceOptions.map((option) => (
                  <Combobox.Option
                    key={String(option.value)}
                    value={String(option.value)}
                    active={option.value === optimisticSource}
                  >
                    {option.label}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          {featureFlags?.following && (
            <Combobox
              store={feedCombobox}
              onOptionSubmit={(value) => {
                if (value === 'global' || value === 'following') {
                  handleFeedClick(value);
                }
              }}
              width={150}
            >
              <Combobox.Target>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<Combobox.Chevron />}
                  onClick={() => feedCombobox.toggleDropdown()}
                >
                  {selectedFeed?.label}
                </Button>
              </Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options>
                  {feedOptions.map((option) => (
                    <Combobox.Option
                      key={option.value}
                      value={option.value}
                      active={option.value === optimisticFeed}
                    >
                      {option.label}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )}

          <Button
            component={Link}
            href={'/explore/open-collections'}
            color="green"
            variant="light"
            leftSection={<FaSeedling />}
          >
            Open Collections
          </Button>
        </Group>
        <FeedFilters />
      </Group>
    </ScrollAreaAutosize>
  );
}
