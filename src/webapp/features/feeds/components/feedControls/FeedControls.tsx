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
import { ActivitySource, UrlType, ActivityType } from '@semble/types';
import { useOptimistic, useState, useTransition } from 'react';
import { FaRegNoteSticky, FaSeedling } from 'react-icons/fa6';
import { IoMdCheckmark } from 'react-icons/io';
import MarginLogo from '@/components/MarginLogo';
import SembleLogo from '@/assets/semble-logo.svg';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';
import { BiLink } from 'react-icons/bi';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

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

const activityTypeOptions = [
  { value: ActivityType.CARD_COLLECTED, label: 'Card saves', icon: <FaRegNoteSticky /> },
  { value: ActivityType.CONNECTION_CREATED, label: 'Connections', icon: <BiLink /> },
];

const activityTypeToParam = (type: ActivityType): string => type.toLowerCase();

const paramToActivityType = (param: string): ActivityType | undefined =>
  Object.values(ActivityType).find((t) => t.toLowerCase() === param);

export default function FeedControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: featureFlags } = useFeatureFlags();
  const sourceFromUrl = searchParams.get('source') as ActivitySource | null;
  const feedFromUrl =
    (searchParams.get('feed') as 'global' | 'following') || 'global';
  const typeFromUrl = searchParams.get('type') as UrlType | null;
  const activityTypesFromUrl = searchParams
    .getAll('activityTypes')
    .map(paramToActivityType)
    .filter((t): t is ActivityType => t !== undefined);

  const [optimisticSource, setOptimisticSource] =
    useOptimistic<ActivitySource | null>(sourceFromUrl);
  const [optimisticFeed, setOptimisticFeed] = useOptimistic<
    'global' | 'following'
  >(feedFromUrl);
  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    typeFromUrl,
  );
  const [optimisticActivityTypes, setOptimisticActivityTypes] =
    useOptimistic<ActivityType[]>(activityTypesFromUrl);

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

  const handleActivityTypeClick = (activityType: ActivityType | null) => {
    startTransition(() => {
      const nextTypes = activityType ? [activityType] : [];

      setOptimisticActivityTypes(nextTypes);

      const params = new URLSearchParams(searchParams.toString());
      params.delete('activityTypes');
      nextTypes.forEach((type) =>
        params.append('activityTypes', activityTypeToParam(type)),
      );

      router.push(`?${params.toString()}`, { scroll: false });
    });
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
              {` / ${selectedFeed?.label}`}
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

            <Menu.Label>Card Type</Menu.Label>
            <Popover
              opened={typePopoverOpened}
              onChange={setTypePopoverOpened}
              shadow="sm"
            >
              <Popover.Target>
                <Menu.Item
                  variant="light"
                  leftSection={<SelectedTypeIcon />}
                  closeMenuOnClick={false}
                  onClick={(e) => {
                    setTypePopoverOpened((o) => !o);
                  }}
                >
                  {optimisticType ? upperFirst(optimisticType) : 'All Cards'}
                </Menu.Item>
              </Popover.Target>

              <Popover.Dropdown maw={300} p={'xs'}>
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

            {featureFlags?.connections && (
              <>
                <Menu.Label>Activity Type</Menu.Label>
                <Menu.Sub>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item
                      fz="md"
                      fw={600}
                      leftSection={
                        optimisticActivityTypes.length === 1
                          ? activityTypeOptions.find(
                              (o) => o.value === optimisticActivityTypes[0],
                            )?.icon
                          : null
                      }
                    >
                      {optimisticActivityTypes.length === 1
                        ? (activityTypeOptions.find(
                            (o) => o.value === optimisticActivityTypes[0],
                          )?.label ?? 'All')
                        : 'All'}
                    </Menu.Sub.Item>
                  </Menu.Sub.Target>

                  <Menu.Sub.Dropdown>
                    <Menu.Item
                      onClick={() => handleActivityTypeClick(null)}
                      rightSection={
                        optimisticActivityTypes.length === 0 ? (
                          <IoMdCheckmark />
                        ) : null
                      }
                    >
                      All
                    </Menu.Item>
                    {activityTypeOptions.map((option) => (
                      <Menu.Item
                        key={option.value}
                        onClick={() => handleActivityTypeClick(option.value)}
                        leftSection={option.icon}
                        rightSection={
                          optimisticActivityTypes.length === 1 &&
                          optimisticActivityTypes[0] === option.value ? (
                            <IoMdCheckmark />
                          ) : null
                        }
                      >
                        {option.label}
                      </Menu.Item>
                    ))}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
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
    </ScrollAreaAutosize>
  );
}
