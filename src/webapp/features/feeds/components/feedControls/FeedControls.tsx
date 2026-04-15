'use client';

import { Button, Group, Menu, Popover, Scroller } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActivitySource, UrlType, ActivityType } from '@semble/types';
import { Fragment, useEffect, useState } from 'react';
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
  sourceOptions,
} from '@/features/feeds/lib/feedOptions';

const FEED_PARAM_KEYS = ['source', 'feed', 'type', 'activityTypes'] as const;

function buildFeedParams(
  base: URLSearchParams,
  settings: {
    feedSource: ActivitySource | null;
    feedView: FeedView;
    feedUrlType: UrlType | null;
    feedActivityType: ActivityType | null;
  },
) {
  const params = new URLSearchParams(base);
  FEED_PARAM_KEYS.forEach((key) => params.delete(key));

  if (settings.feedSource) params.set('source', settings.feedSource);
  if (settings.feedView !== 'global') params.set('feed', settings.feedView);
  if (settings.feedUrlType) params.set('type', settings.feedUrlType);
  if (settings.feedActivityType)
    params.append(
      'activityTypes',
      activityTypeToParam(settings.feedActivityType),
    );

  return params;
}

export default function FeedControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSetting } = useUserSettings();

  const [typePopoverOpened, setTypePopoverOpened] = useState(false);

  useEffect(() => {
    const nextParams = buildFeedParams(searchParams, settings);
    const currentParams = new URLSearchParams(searchParams);
    // normalize param order so we only replace when semantically different
    const normalize = (p: URLSearchParams) => {
      const entries: [string, string][] = [];
      p.forEach((value, key) => entries.push([key, value]));
      entries.sort(([a1, b1], [a2, b2]) =>
        a1 === a2 ? b1.localeCompare(b2) : a1.localeCompare(a2),
      );
      return entries.map(([k, v]) => `${k}=${v}`).join('&');
    };
    if (normalize(nextParams) !== normalize(currentParams)) {
      const query = nextParams.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    }
  }, [settings, searchParams, router]);

  const selectedSource =
    sourceOptions.find((o) => o.value === settings.feedSource) ||
    sourceOptions[0];
  const selectedFeed =
    feedOptions.find((o) => o.value === settings.feedView) || feedOptions[0];

  const handleSourceClick = (source: ActivitySource | null) => {
    updateSetting('feedSource', source);
    if (source === ActivitySource.MARGIN) {
      if (settings.feedView === 'following') {
        updateSetting('feedView', 'global');
      }
      if (settings.feedActivityType !== null) {
        updateSetting('feedActivityType', null);
      }
    }
  };

  const handleFeedClick = (feed: FeedView) => {
    updateSetting('feedView', feed);
  };

  const handleTypeClick = (type?: UrlType) => {
    updateSetting('feedUrlType', type ?? null);
    setTypePopoverOpened(false);
  };

  const handleActivityTypeClick = (activityType: ActivityType | null) => {
    updateSetting('feedActivityType', activityType);
  };

  const hasActiveFilters =
    settings.feedSource !== null ||
    settings.feedView !== 'global' ||
    settings.feedUrlType !== null ||
    settings.feedActivityType !== null;

  const handleClear = () => {
    updateSetting('feedSource', null);
    updateSetting('feedView', 'global');
    updateSetting('feedUrlType', null);
    updateSetting('feedActivityType', null);
  };

  const isMarginSource = settings.feedSource === ActivitySource.MARGIN;

  const SelectedTypeIcon =
    settings.feedUrlType === null
      ? MdFilterList
      : getUrlTypeIcon(settings.feedUrlType);

  return (
    <Group gap={'xs'} justify="space-between" wrap="nowrap">
      <Scroller>
        <Menu width={200} position="bottom-start">
          <Menu.Target>
            <Button variant="light" color="cyan" leftSection={<MdFilterList />}>
              {selectedSource?.label}
              {` / ${selectedFeed?.label}`}
              {settings.feedUrlType && ` / ${upperFirst(settings.feedUrlType)}`}
              {settings.feedActivityType &&
                ` / ${activityTypeOptions.find((o) => o.value === settings.feedActivityType)?.label}`}
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Feed</Menu.Label>
            {feedOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onClick={() => handleFeedClick(option.value)}
                rightSection={
                  option.value === settings.feedView ? <IoMdCheckmark /> : null
                }
                closeMenuOnClick={false}
              >
                {option.label}
              </Menu.Item>
            ))}

            <Menu.Label>Source</Menu.Label>
            <Menu.Sub>
              <Menu.Sub.Target>
                <Menu.Sub.Item
                  fz="md"
                  fw={600}
                  leftSection={selectedSource?.icon}
                >
                  {selectedSource?.label}
                </Menu.Sub.Item>
              </Menu.Sub.Target>

              <Menu.Sub.Dropdown>
                {sourceOptions.map((option) => (
                  <Menu.Item
                    key={String(option.value)}
                    onClick={() => handleSourceClick(option.value)}
                    leftSection={option.icon}
                    rightSection={
                      option.value === settings.feedSource ? (
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

            <Menu.Label>Activity Type</Menu.Label>
            <Menu.Sub>
              <Menu.Sub.Target>
                <Menu.Sub.Item
                  fz="md"
                  fw={600}
                  disabled={isMarginSource}
                  leftSection={
                    settings.feedActivityType
                      ? activityTypeOptions.find(
                          (o) => o.value === settings.feedActivityType,
                        )?.icon
                      : null
                  }
                >
                  {settings.feedActivityType
                    ? (activityTypeOptions.find(
                        (o) => o.value === settings.feedActivityType,
                      )?.label ?? 'All')
                    : 'All'}
                </Menu.Sub.Item>
              </Menu.Sub.Target>

              <Menu.Sub.Dropdown>
                <Menu.Item
                  onClick={() => handleActivityTypeClick(null)}
                  rightSection={
                    settings.feedActivityType === null ? (
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
                      settings.feedActivityType === option.value ? (
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
                  {settings.feedUrlType
                    ? upperFirst(settings.feedUrlType)
                    : 'All Cards'}
                </Menu.Item>
              </Popover.Target>

              <Popover.Dropdown maw={300} p={'xs'}>
                <Group gap={6}>
                  <Button
                    size="xs"
                    color="lime"
                    variant={settings.feedUrlType === null ? 'filled' : 'light'}
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
                        variant={
                          settings.feedUrlType === type ? 'filled' : 'light'
                        }
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

            {hasActiveFilters && (
              <Fragment>
                <Menu.Divider />
                <Menu.Item onClick={handleClear} color="red">
                  Clear filters
                </Menu.Item>
              </Fragment>
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
