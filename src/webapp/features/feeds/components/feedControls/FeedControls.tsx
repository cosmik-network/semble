'use client';

import {
  ScrollAreaAutosize,
  Button,
  Group,
  Menu,
  Image,
  Popover,
} from '@mantine/core';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActivitySource, UrlType } from '@semble/types';
import { useOptimistic, useState, useTransition } from 'react';
import { FaSeedling } from 'react-icons/fa6';
import { IoMdCheckmark } from 'react-icons/io';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import MarginLogo from '@/components/MarginLogo';
import SembleLogo from '@/assets/semble-logo.svg';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';

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
  const typeFromUrl = searchParams.get('type') as UrlType | null;

  const [optimisticSource, setOptimisticSource] =
    useOptimistic<ActivitySource | null>(sourceFromUrl);
  const [optimisticFeed, setOptimisticFeed] = useOptimistic<
    'global' | 'following'
  >(feedFromUrl);
  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    typeFromUrl,
  );

  const [typePopoverOpened, setTypePopoverOpened] = useState(false);

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

  const handleTypeClick = (type?: UrlType) => {
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

    setTypePopoverOpened(false);
  };

  const SelectedTypeIcon =
    optimisticType === null ? MdFilterList : getUrlTypeIcon(optimisticType);

  return (
    <ScrollAreaAutosize type="scroll" offsetScrollbars={'present'}>
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <Menu width={200}>
          <Menu.Target>
            <Button variant="light" color="cyan" leftSection={<MdFilterList />}>
              {selectedSource?.label}
              {featureFlags?.following !== false && ` / ${selectedFeed?.label}`}
              {optimisticType && ` / ${upperFirst(optimisticType)}s`}
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
                closeMenuOnClick={false}
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
                      option.value === optimisticFeed ? <IoMdCheckmark /> : null
                    }
                    closeMenuOnClick={false}
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </>
            )}

            <Menu.Label>Type</Menu.Label>
            <Popover
              opened={typePopoverOpened}
              onChange={setTypePopoverOpened}
              shadow="sm"
            >
              <Popover.Target>
                <Button
                  variant="light"
                  color="gray"
                  radius={'md'}
                  leftSection={<SelectedTypeIcon />}
                  onClick={() => setTypePopoverOpened((o) => !o)}
                  fullWidth
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
                    onClick={() => handleTypeClick()}
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
                        onClick={() => handleTypeClick(type)}
                      >
                        {upperFirst(type)}
                      </Button>
                    );
                  })}
                </Group>
              </Popover.Dropdown>
            </Popover>
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
    </ScrollAreaAutosize>
  );
}
