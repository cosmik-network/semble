'use client';

import { Button, Group, Menu, Popover, Scroller } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActivitySource, UrlType, ActivityType } from '@semble/types';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { FaSeedling } from 'react-icons/fa6';
import { IoMdCheckmark } from 'react-icons/io';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';
import { LinkButton } from '@/components/link/MantineLink';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import {
  activityTypeOptions,
  activityTypeToParam,
  feedOptions,
  FeedView,
  paramToActivityType,
  sourceOptions,
} from '@/features/feeds/lib/feedOptions';

export default function FeedControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSetting } = useUserSettings();

  const hasAnyParam =
    searchParams.has('source') ||
    searchParams.has('feed') ||
    searchParams.has('type') ||
    searchParams.has('activityTypes');

  const sourceFromUrl = searchParams.get('source') as ActivitySource | null;
  const feedFromUrl = searchParams.get('feed') as FeedView | null;
  const typeFromUrl = searchParams.get('type') as UrlType | null;
  const activityTypesFromUrl = searchParams
    .getAll('activityTypes')
    .map(paramToActivityType)
    .filter((t): t is ActivityType => t !== undefined);

  const effectiveSource = hasAnyParam ? sourceFromUrl : settings.feedSource;
  const effectiveFeed: FeedView = hasAnyParam
    ? (feedFromUrl ?? 'global')
    : settings.feedView;
  const effectiveType = hasAnyParam ? typeFromUrl : settings.feedUrlType;
  const effectiveActivityTypes = hasAnyParam
    ? activityTypesFromUrl
    : settings.feedActivityType
      ? [settings.feedActivityType]
      : [];

  const [optimisticSource, setOptimisticSource] =
    useOptimistic<ActivitySource | null>(effectiveSource);
  const [optimisticFeed, setOptimisticFeed] =
    useOptimistic<FeedView>(effectiveFeed);
  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    effectiveType,
  );
  const [optimisticActivityTypes, setOptimisticActivityTypes] =
    useOptimistic<ActivityType[]>(effectiveActivityTypes);

  const [typePopoverOpened, setTypePopoverOpened] = useState(false);

  const [, startTransition] = useTransition();

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (hasAnyParam) return;

    const params = new URLSearchParams();
    if (settings.feedSource) params.set('source', settings.feedSource);
    if (settings.feedView && settings.feedView !== 'global')
      params.set('feed', settings.feedView);
    if (settings.feedUrlType) params.set('type', settings.feedUrlType);
    if (settings.feedActivityType)
      params.append(
        'activityTypes',
        activityTypeToParam(settings.feedActivityType),
      );

    const query = params.toString();
    if (query) router.replace(`?${query}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, hasAnyParam]);

  const selectedSource =
    sourceOptions.find((o) => o.value === optimisticSource) || sourceOptions[0];
  const selectedFeed =
    feedOptions.find((o) => o.value === optimisticFeed) || feedOptions[0];

  const handleSourceClick = (source: ActivitySource | null) => {
    startTransition(() => {
      setOptimisticSource(source);
      updateSetting('feedSource', source);

      const params = new URLSearchParams(searchParams.toString());
      if (source) {
        params.set('source', source);
      } else {
        params.delete('source');
      }

      if (source === ActivitySource.MARGIN && optimisticFeed === 'following') {
        setOptimisticFeed('global');
        updateSetting('feedView', 'global');
        params.set('feed', 'global');
      }

      if (
        source === ActivitySource.MARGIN &&
        optimisticActivityTypes.length > 0
      ) {
        setOptimisticActivityTypes([]);
        updateSetting('feedActivityType', null);
        params.delete('activityTypes');
      }

      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFeedClick = (feed: FeedView) => {
    startTransition(() => {
      setOptimisticFeed(feed);
      updateSetting('feedView', feed);

      const params = new URLSearchParams(searchParams.toString());
      params.set('feed', feed);

      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleTypeClick = (type?: UrlType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticType(nextType);
      updateSetting('feedUrlType', nextType);

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
      updateSetting('feedActivityType', activityType);

      const params = new URLSearchParams(searchParams.toString());
      params.delete('activityTypes');
      nextTypes.forEach((type) =>
        params.append('activityTypes', activityTypeToParam(type)),
      );

      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const hasActiveFilters =
    optimisticSource !== settings.feedSource ||
    optimisticFeed !== settings.feedView ||
    optimisticType !== settings.feedUrlType ||
    (optimisticActivityTypes[0] ?? null) !== settings.feedActivityType;

  const handleClear = () => {
    startTransition(() => {
      setOptimisticSource(settings.feedSource);
      setOptimisticFeed(settings.feedView);
      setOptimisticType(settings.feedUrlType);
      setOptimisticActivityTypes(
        settings.feedActivityType ? [settings.feedActivityType] : [],
      );

      const params = new URLSearchParams();
      if (settings.feedSource) params.set('source', settings.feedSource);
      if (settings.feedView && settings.feedView !== 'global')
        params.set('feed', settings.feedView);
      if (settings.feedUrlType) params.set('type', settings.feedUrlType);
      if (settings.feedActivityType)
        params.append(
          'activityTypes',
          activityTypeToParam(settings.feedActivityType),
        );

      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: false });
    });
  };

  const isMarginSource = optimisticSource === ActivitySource.MARGIN;

  const SelectedTypeIcon =
    optimisticType === null ? MdFilterList : getUrlTypeIcon(optimisticType);

  return (
    <Group gap={'xs'} justify="space-between" wrap="nowrap">
      <Scroller>
        <Menu width={200} position="bottom-start">
          <Menu.Target>
            <Button variant="light" color="cyan" leftSection={<MdFilterList />}>
              {selectedSource?.label}
              {` / ${selectedFeed?.label}`}
              {optimisticType && ` / ${upperFirst(optimisticType)}`}
              {optimisticActivityTypes.length === 1 &&
                ` / ${activityTypeOptions.find((o) => o.value === optimisticActivityTypes[0])?.label}`}
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
                  onClick={() => {
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

            <>
              <Menu.Label>Activity Type</Menu.Label>
              <Menu.Sub>
                <Menu.Sub.Target>
                  <Menu.Sub.Item
                    fz="md"
                    fw={600}
                    disabled={isMarginSource}
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
                    closeMenuOnClick={false}
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
                      closeMenuOnClick={false}
                    >
                      {option.label}
                    </Menu.Item>
                  ))}
                </Menu.Sub.Dropdown>
              </Menu.Sub>
            </>

            {hasActiveFilters && (
              <>
                <Menu.Divider />
                <Menu.Item onClick={handleClear} color="red">
                  Reset to defaults
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Scroller>

      <Group gap={'xs'} wrap="nowrap">
        <LinkButton
          href={'/explore/open-collections'}
          color="green"
          variant="light"
        >
          <FaSeedling />
        </LinkButton>
        <LinkButton
          href={'/explore/atmosphereConf-collections'}
          color="blue"
          variant="light"
          fz={'md'}
        >
          🪿
        </LinkButton>
      </Group>
    </Group>
  );
}
