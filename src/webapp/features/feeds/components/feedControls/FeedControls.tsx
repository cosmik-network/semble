'use client';

import { ScrollAreaAutosize, Button, Group, Menu, Image } from '@mantine/core';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FeedFilters from '../feedFilters/FeedFilters';
import { ActivitySource } from '@semble/types';
import { useOptimistic, useTransition } from 'react';
import { FaSeedling } from 'react-icons/fa6';
import { IoMdCheckmark } from 'react-icons/io';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import MarginLogo from '@/components/MarginLogo';
import SembleLogo from '@/assets/semble-logo.svg';

const sourceOptions = [
  { value: null, label: 'All', icon: null },
  {
    value: ActivitySource.SEMBLE,
    label: 'Semble',
    icon: (
      <Image
        src={SembleLogo.src}
        alt="Semble logo"
        w={16}
        h={'auto'}
        mx={'auto'}
      />
    ),
  },
  { value: ActivitySource.MARGIN, label: 'Margin', icon: <MarginLogo /> },
];

const feedOptions = [
  { value: 'global' as const, label: 'Global' },
  { value: 'following' as const, label: 'Following' },
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

      // if Margin is selected and feed is Following, switch to Global
      if (source === ActivitySource.MARGIN && feedFromUrl === 'following') {
        setOptimisticFeed('global');
        params.set('feed', 'global');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFeedClick = (feed: 'global' | 'following') => {
    startTransition(() => {
      setOptimisticFeed(feed);

      const params = new URLSearchParams(searchParams.toString());
      params.set('feed', feed);

      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <ScrollAreaAutosize type="scroll" offsetScrollbars={'x'}>
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <Group gap={'xs'} wrap="nowrap">
          <Menu width={200}>
            <Menu.Target>
              <Button variant="light" color="cyan">
                {selectedSource?.label}
                {featureFlags?.following && ` / ${selectedFeed?.label}`}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Source</Menu.Label>
              {sourceOptions.map((option) => (
                <Menu.Item
                  key={String(option.value)}
                  onClick={() => handleSourceClick(option.value)}
                  leftSection={option.icon}
                  rightSection={
                    option.value === optimisticSource ? <IoMdCheckmark /> : null
                  }
                >
                  {option.label}
                </Menu.Item>
              ))}

              {featureFlags?.following && (
                <>
                  <Menu.Label>Feed</Menu.Label>
                  {feedOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onClick={() => handleFeedClick(option.value)}
                      rightSection={
                        option.value === optimisticFeed ? (
                          <IoMdCheckmark />
                        ) : null
                      }
                    >
                      {option.label}
                    </Menu.Item>
                  ))}
                </>
              )}
            </Menu.Dropdown>
          </Menu>

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
